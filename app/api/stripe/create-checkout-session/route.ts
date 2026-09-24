import { NextResponse } from "next/server";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const REFERRAL_TABLE = "symptomai_referrals";

function getSupabaseAdmin() {
  const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  const serviceRoleKey =
    process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error(
      "Supabase server credentials are missing."
    );
  }

  return createClient(
    supabaseUrl,
    serviceRoleKey,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

function clean(value: unknown) {
  if (
    value === null ||
    value === undefined
  ) {
    return "";
  }

  return String(value).trim();
}

function generateReferralCode() {
  const chars =
    "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

  let code = "HCT-";

  for (let i = 0; i < 6; i++) {
    code +=
      chars[
        Math.floor(
          Math.random() * chars.length
        )
      ];
  }

  return code;
}

export async function POST(
  request: Request
) {
  let createdReferralId = "";

  try {
    // ==========================================
    // ENVIRONMENT
    // ==========================================

    const stripeSecretKey =
      process.env.STRIPE_SECRET_KEY?.trim();

    if (!stripeSecretKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "STRIPE_SECRET_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    const stripe =
      new Stripe(stripeSecretKey);

    const supabase =
      getSupabaseAdmin();

    // ==========================================
    // REQUEST
    // ==========================================

    const body =
      await request.json();

    const patient =
      body?.patient || {};

    const consultationReason =
      clean(
        body?.consultation_reason
      ) ||
      "Virtual GP Consultation";

    const firstName =
      clean(patient.first_name);

    const surname =
      clean(patient.surname);

    const email =
      clean(patient.email).toLowerCase();

    const mobileNumber =
      clean(
        patient.mobile_number ||
          patient.mobile
      );

    const identityNumber =
      clean(
        patient.identity_number ||
          patient.id_number ||
          patient.passport_number
      );

    const dateOfBirth =
      clean(
        patient.date_of_birth ||
          patient.dob
      );

    const gender =
      clean(patient.gender);

    const country =
      clean(patient.country);

    // ==========================================
    // VALIDATION
    // ==========================================

    if (
      !firstName ||
      !surname ||
      !email
    ) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Patient information is incomplete.",
        },
        { status: 400 }
      );
    }

    // ==========================================
    // APP URL
    // ==========================================

    const requestUrl =
      new URL(request.url);

    const appUrl =
      process.env
        .NEXT_PUBLIC_APP_URL
        ?.trim() ||
      requestUrl.origin;

    // ==========================================
    // CREATE REFERRAL BEFORE STRIPE
    // ==========================================

    const referralCode =
      generateReferralCode();

    const now =
      new Date().toISOString();

    /*
     * IMPORTANT:
     *
     * The referral must exist BEFORE
     * Stripe checkout is created.
     *
     * payment-success can then locate
     * this exact referral using:
     *
     * 1. stripe_session_id
     * 2. metadata.referral_id
     * 3. metadata.referral_code
     * 4. email fallback
     */

    const referralPayload = {
      referral_code:
        referralCode,

      first_name:
        firstName,

      surname:
        surname,

      email:
        email,

      mobile_number:
        mobileNumber,

      identity_number:
        identityNumber,

      date_of_birth:
        dateOfBirth,

      gender:
        gender,

      country:
        country,

      consultation_reason:
        consultationReason,

      source:
        "HIVClinTest",

      payment_status:
        "pending",

      payment_amount:
        25000,

      payment_currency:
        "ZAR",

      queue_status:
        "awaiting_payment",

      referral_status:
        "pending",

      created_at:
        now,

      updated_at:
        now,
    };

    let referral: any = null;

    // ==========================================
    // TRY FULL REFERRAL INSERT
    // ==========================================

    const fullInsert =
      await supabase
        .from(REFERRAL_TABLE)
        .insert(referralPayload)
        .select("*")
        .single();

    if (
      !fullInsert.error &&
      fullInsert.data
    ) {
      referral =
        fullInsert.data;
    } else {
      console.error(
        "Full referral insert failed:",
        fullInsert.error
      );

      /*
       * Compatibility insert.
       *
       * This allows the route to work
       * if your current Supabase table
       * does not yet contain all of the
       * newer payment/queue columns.
       */

      const basicInsert =
        await supabase
          .from(REFERRAL_TABLE)
          .insert({
            referral_code:
              referralCode,

            first_name:
              firstName,

            surname:
              surname,

            email:
              email,

            mobile_number:
              mobileNumber,

            identity_number:
              identityNumber,

            date_of_birth:
              dateOfBirth,

            gender:
              gender,

            country:
              country,

            consultation_reason:
              consultationReason,

            source:
              "HIVClinTest",
          })
          .select("*")
          .single();

      if (
        basicInsert.error ||
        !basicInsert.data
      ) {
        console.error(
          "Basic referral insert failed:",
          basicInsert.error
        );

        return NextResponse.json(
          {
            success: false,

            error:
              basicInsert.error
                ?.message ||
              fullInsert.error
                ?.message ||
              "Unable to create the Virtual GP referral.",
          },
          { status: 500 }
        );
      }

      referral =
        basicInsert.data;
    }

    createdReferralId =
      clean(referral.id);

    if (!createdReferralId) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Referral was created but no referral ID was returned.",
        },
        { status: 500 }
      );
    }

    const savedReferralCode =
      clean(
        referral.referral_code
      ) ||
      referralCode;

    // ==========================================
    // CREATE STRIPE CHECKOUT
    // ==========================================

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        allow_promotion_codes:
          true,

        payment_method_types: [
          "card",
        ],

        customer_email:
          email,

        line_items: [
          {
            price_data: {
              currency: "zar",

              unit_amount:
                25000,

              product_data: {
                name:
                  "HIVClinTest Virtual GP Consultation",

                description:
                  consultationReason,
              },
            },

            quantity: 1,
          },
        ],

        // ======================================
        // CRITICAL REFERRAL LINK
        // ======================================

        metadata: {
          source:
            "HIVClinTest",

          referral_id:
            createdReferralId,

          referral_code:
            savedReferralCode,

          first_name:
            firstName,

          surname:
            surname,

          email:
            email,

          mobile_number:
            mobileNumber,

          identity_number:
            identityNumber,

          date_of_birth:
            dateOfBirth,

          gender:
            gender,

          country:
            country,

          consultation_reason:
            consultationReason,
        },

        success_url:
          `${appUrl}/payment/success?session_id={CHECKOUT_SESSION_ID}`,

        cancel_url:
          `${appUrl}/assessment/virtual-gp?payment=cancelled`,
      });

    if (!session.url) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Stripe did not return a Checkout URL.",
        },
        { status: 500 }
      );
    }

    // ==========================================
    // SAVE STRIPE SESSION ON REFERRAL
    // ==========================================

    const sessionUpdate =
      await supabase
        .from(REFERRAL_TABLE)
        .update({
          stripe_session_id:
            session.id,

          payment_status:
            "pending",

          updated_at:
            new Date()
              .toISOString(),
        })
        .eq(
          "id",
          createdReferralId
        );

    if (sessionUpdate.error) {
      console.error(
        "Could not save Stripe session to referral:",
        sessionUpdate.error
      );

      /*
       * Compatibility fallback:
       * try only stripe_session_id.
       */

      const fallbackUpdate =
        await supabase
          .from(
            REFERRAL_TABLE
          )
          .update({
            stripe_session_id:
              session.id,
          })
          .eq(
            "id",
            createdReferralId
          );

      if (
        fallbackUpdate.error
      ) {
        /*
         * We do NOT cancel checkout here.
         *
         * referral_id and referral_code
         * are already stored in Stripe
         * metadata, so payment-success
         * can still locate the referral.
         */

        console.error(
          "Stripe session fallback update failed:",
          fallbackUpdate.error
        );
      }
    }

    // ==========================================
    // SUCCESS
    // ==========================================

    console.log(
      "Stripe checkout created:",
      {
        referralId:
          createdReferralId,

        referralCode:
          savedReferralCode,

        stripeSessionId:
          session.id,

        email,
      }
    );

    return NextResponse.json({
      success: true,

      referral_id:
        createdReferralId,

      referral_code:
        savedReferralCode,

      session_id:
        session.id,

      url:
        session.url,
    });
  } catch (error) {
    console.error(
      "Stripe Checkout error:",
      error
    );

    return NextResponse.json(
      {
        success: false,

        error:
          error instanceof Error
            ? error.message
            : "Unable to create Stripe Checkout.",

        referral_id:
          createdReferralId ||
          undefined,
      },
      { status: 500 }
    );
  }
}
