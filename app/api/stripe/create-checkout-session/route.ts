import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
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

    const stripe = new Stripe(
      stripeSecretKey
    );

    const body =
      await request.json();

    const patient =
      body?.patient || {};

    const consultationReason =
      body?.consultation_reason ||
      "Virtual GP Consultation";

    if (
      !patient.first_name ||
      !patient.surname ||
      !patient.email
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

    const requestUrl =
      new URL(request.url);

    const appUrl =
      process.env.NEXT_PUBLIC_APP_URL?.trim() ||
      requestUrl.origin;

    const session =
      await stripe.checkout.sessions.create({
        mode: "payment",

        payment_method_types: [
          "card",
        ],

        customer_email:
          patient.email,

        line_items: [
          {
            price_data: {
              currency: "zar",

              unit_amount: 25000,

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

        metadata: {
          source:
            "HIVClinTest",

          first_name:
            String(
              patient.first_name ||
                ""
            ),

          surname:
            String(
              patient.surname ||
                ""
            ),

          email:
            String(
              patient.email || ""
            ),

          mobile_number:
            String(
              patient.mobile_number ||
                ""
            ),

          identity_number:
            String(
              patient.identity_number ||
                ""
            ),

          date_of_birth:
            String(
              patient.date_of_birth ||
                ""
            ),

          gender:
            String(
              patient.gender || ""
            ),

          country:
            String(
              patient.country || ""
            ),

          consultation_reason:
            String(
              consultationReason
            ),
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

    return NextResponse.json({
      success: true,
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
      },
      { status: 500 }
    );
  }
}
