import Link from "next/link";
import Stripe from "stripe";
import {
  createClient,
} from "@supabase/supabase-js";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

const supabaseUrl =
  process.env.NEXT_PUBLIC_SUPABASE_URL;

const serviceRoleKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY;

const REFERRAL_TABLE =
  "symptomai_referrals";


// ======================================================
// SUPABASE ADMIN
// ======================================================

function getSupabaseAdmin() {
  if (
    !supabaseUrl ||
    !serviceRoleKey
  ) {
    throw new Error(
      "Supabase server credentials are missing.",
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
    },
  );
}


// ======================================================
// PAYMENT SUCCESS PAGE
// ======================================================

export default async function PaymentSuccessPage({
  searchParams,
}: PageProps) {

  const params =
    await searchParams;

  const sessionId =
    params.session_id;


  let paid = false;
  let paymentStatus = "";

  let amountSubtotal = 0;
  let amountDiscount = 0;
  let amountTotal = 0;

  let customerEmail = "";
  let customerName = "";

  let errorMessage = "";

  let referralSubmitted = false;
  let referralCode = "";
  let referralError = "";


  // ====================================================
  // VERIFY STRIPE
  // ====================================================

  if (!sessionId) {

    errorMessage =
      "No Stripe payment session was provided.";

  } else if (
    !process.env.STRIPE_SECRET_KEY
  ) {

    errorMessage =
      "Stripe has not been configured on the server.";

  } else {

    try {

      const stripe =
        new Stripe(
          process.env.STRIPE_SECRET_KEY,
        );


      const session =
        await stripe.checkout.sessions.retrieve(
          sessionId,
        );


      paymentStatus =
        session.payment_status || "";


      /*
       * Stripe may return paid OR
       * no_payment_required for a fully
       * discounted checkout.
       */

      paid =
        session.payment_status ===
          "paid" ||
        session.payment_status ===
          "no_payment_required";


      amountSubtotal =
        session.amount_subtotal || 0;


      amountDiscount =
        session.total_details
          ?.amount_discount || 0;


      amountTotal =
        session.amount_total || 0;


      customerEmail =
        session.customer_details
          ?.email ||
        session.customer_email ||
        "";


      customerName =
        session.customer_details
          ?.name ||
        "";


      // ==================================================
      // PAID → SUBMIT TO CARESCRIBER QUEUE
      // ==================================================

      if (paid) {

        try {

          const supabase =
            getSupabaseAdmin();

          const now =
            new Date()
              .toISOString();


          /*
           * First try to find the referral using
           * the Stripe session ID.
           *
           * This is the preferred link between
           * payment and referral.
           */

          let {
            data: referral,
            error: lookupError,
          } =
            await supabase
              .from(
                REFERRAL_TABLE,
              )
              .select("*")
              .eq(
                "stripe_session_id",
                session.id,
              )
              .maybeSingle();


          if (lookupError) {

            console.error(
              "Referral lookup by Stripe session failed:",
              lookupError,
            );

          }


          /*
           * If stripe_session_id was not saved
           * before checkout, use metadata.
           *
           * The checkout creation route should
           * ideally send:
           *
           * metadata.referral_id
           * metadata.referral_code
           */

          const metadataReferralId =
            session.metadata
              ?.referral_id ||
            session.metadata
              ?.referralId ||
            "";


          const metadataReferralCode =
            session.metadata
              ?.referral_code ||
            session.metadata
              ?.referralCode ||
            "";


          // ==============================================
          // LOOKUP BY REFERRAL ID
          // ==============================================

          if (
            !referral &&
            metadataReferralId
          ) {

            const result =
              await supabase
                .from(
                  REFERRAL_TABLE,
                )
                .select("*")
                .eq(
                  "id",
                  metadataReferralId,
                )
                .maybeSingle();


            if (!result.error) {
              referral =
                result.data;
            } else {

              console.error(
                "Referral lookup by ID failed:",
                result.error,
              );

            }
          }


          // ==============================================
          // LOOKUP BY REFERRAL CODE
          // ==============================================

          if (
            !referral &&
            metadataReferralCode
          ) {

            const result =
              await supabase
                .from(
                  REFERRAL_TABLE,
                )
                .select("*")
                .eq(
                  "referral_code",
                  metadataReferralCode,
                )
                .maybeSingle();


            if (!result.error) {
              referral =
                result.data;
            } else {

              console.error(
                "Referral lookup by code failed:",
                result.error,
              );

            }
          }


          // ==============================================
          // FALLBACK: LOOKUP BY EMAIL
          // ==============================================

          /*
           * This fallback helps the current build
           * if checkout metadata has not yet been
           * added.
           *
           * We only look for the most recent
           * unpaid/pending referral for the same
           * patient email.
           */

          if (
            !referral &&
            customerEmail
          ) {

            const result =
              await supabase
                .from(
                  REFERRAL_TABLE,
                )
                .select("*")
                .eq(
                  "email",
                  customerEmail,
                )
                .order(
                  "created_at",
                  {
                    ascending: false,
                  },
                )
                .limit(1)
                .maybeSingle();


            if (!result.error) {
              referral =
                result.data;
            } else {

              console.error(
                "Referral lookup by email failed:",
                result.error,
              );

            }
          }


          // ==============================================
          // REFERRAL FOUND
          // ==============================================

          if (referral) {

            const referralId =
              String(
                referral.id,
              );


            /*
             * Main update.
             *
             * payment_status = paid
             * queue_status   = waiting
             *
             * These are the important fields for
             * the CareScriber inbox.
             */

            const {
              data: updatedReferral,
              error: updateError,
            } =
              await supabase
                .from(
                  REFERRAL_TABLE,
                )
                .update({
                  payment_status:
                    "paid",

                  payment_amount:
                    amountTotal,

                  payment_currency:
                    (
                      session.currency ||
                      "zar"
                    ).toUpperCase(),

                  stripe_session_id:
                    session.id,

                  queue_status:
                    "waiting",

                  referral_status:
                    "pending",

                  paid_at:
                    now,

                  submitted_at:
                    referral.submitted_at ||
                    now,

                  updated_at:
                    now,
                })
                .eq(
                  "id",
                  referralId,
                )
                .select("*")
                .single();


            // ============================================
            // FULL UPDATE WORKED
            // ============================================

            if (
              !updateError &&
              updatedReferral
            ) {

              referralSubmitted =
                true;

              referralCode =
                String(
                  updatedReferral
                    .referral_code ||
                  "",
                );


              console.log(
                "Referral successfully submitted to CareScriber queue:",
                {
                  id:
                    updatedReferral.id,

                  referralCode:
                    updatedReferral
                      .referral_code,

                  paymentStatus:
                    updatedReferral
                      .payment_status,

                  queueStatus:
                    updatedReferral
                      .queue_status,

                  stripeSessionId:
                    updatedReferral
                      .stripe_session_id,
                },
              );

            } else {

              console.error(
                "Full referral payment update failed:",
                updateError,
              );


              /*
               * Compatibility fallback.
               *
               * Older table versions may not contain
               * every new field.
               */

              const fallbackResult =
                await supabase
                  .from(
                    REFERRAL_TABLE,
                  )
                  .update({
                    payment_status:
                      "paid",

                    queue_status:
                      "waiting",

                    stripe_session_id:
                      session.id,

                    paid_at:
                      now,
                  })
                  .eq(
                    "id",
                    referralId,
                  )
                  .select("*")
                  .single();


              if (
                fallbackResult.error
              ) {

                referralError =
                  fallbackResult
                    .error
                    .message;


                console.error(
                  "Fallback referral update failed:",
                  fallbackResult.error,
                );

              } else {

                referralSubmitted =
                  true;

                referralCode =
                  String(
                    fallbackResult
                      .data
                      ?.referral_code ||
                    "",
                  );


                console.log(
                  "Referral submitted using compatibility update:",
                  fallbackResult.data,
                );

              }
            }

          } else {

            referralError =
              "Payment was verified, but the matching referral could not be found.";


            console.error(
              "PAID STRIPE SESSION BUT NO REFERRAL FOUND",
              {
                sessionId:
                  session.id,

                customerEmail,

                metadata:
                  session.metadata,
              },
            );
          }

        } catch (
          referralSubmitError
        ) {

          console.error(
            "CareScriber referral submission error:",
            referralSubmitError,
          );


          referralError =
            referralSubmitError instanceof Error
              ? referralSubmitError.message
              : "The referral could not be submitted to CareScriber.";
        }
      }

    } catch (error) {

      console.error(
        "Stripe verification error:",
        error,
      );


      errorMessage =
        "We could not verify your Stripe payment.";
    }
  }


  // ====================================================
  // FORMAT MONEY
  // ====================================================

  function formatRand(
    cents: number,
  ) {

    return `R${(
      cents / 100
    ).toFixed(2)}`;
  }


  const originalAmount =
    formatRand(
      amountSubtotal || 25000,
    );


  const discountAmount =
    formatRand(
      amountDiscount,
    );


  const finalAmount =
    formatRand(
      amountTotal,
    );


  const hasDiscount =
    amountDiscount > 0;


  // ====================================================
  // PAGE
  // ====================================================

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6faf7",
        padding: "60px 20px",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        color: "#17352d",
      }}
    >

      <div
        style={{
          width: "100%",
          maxWidth: "650px",
          margin: "0 auto",
          background: "#ffffff",
          borderRadius: "24px",
          padding: "40px",
          boxSizing: "border-box",
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.08)",
        }}
      >

        {paid ? (
          <>

            {/* SUCCESS ICON */}

            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "#39ff14",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                fontSize: "36px",
                fontWeight: 900,
                marginBottom: "25px",
              }}
            >
              ✓
            </div>


            <p
              style={{
                margin: "0 0 10px",
                fontWeight: 800,
                textTransform:
                  "uppercase",
                fontSize: "13px",
                letterSpacing: "1px",
              }}
            >
              Payment verified
            </p>


            <h1
              style={{
                margin: "0 0 15px",
                fontSize:
                  "clamp(30px, 7vw, 36px)",
              }}
            >
              Virtual GP request
            </h1>


            <p
              style={{
                fontSize: "18px",
                lineHeight: 1.6,
                color: "#536860",
              }}
            >
              Your payment has been
              successfully verified.
            </p>


            {/* PATIENT */}

            {(customerName ||
              customerEmail) && (

              <div
                style={{
                  marginTop: "22px",
                  padding: "18px",
                  background:
                    "#f6f7f6",
                  borderRadius: "14px",
                }}
              >

                {customerName && (
                  <div
                    style={{
                      marginBottom:
                        "8px",
                    }}
                  >
                    <strong>
                      Patient:
                    </strong>{" "}
                    {customerName}
                  </div>
                )}


                {customerEmail && (
                  <div>
                    <strong>
                      Payment email:
                    </strong>{" "}
                    {customerEmail}
                  </div>
                )}

              </div>
            )}


            {/* PAYMENT SUMMARY */}

            <div
              style={{
                marginTop: "28px",
                padding: "22px",
                background: "#f8faf9",
                border:
                  "1px solid #dfe7e3",
                borderRadius: "16px",
              }}
            >

              <h2
                style={{
                  margin:
                    "0 0 20px",
                  fontSize: "20px",
                }}
              >
                Payment summary
              </h2>


              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "20px",
                  marginBottom:
                    "12px",
                }}
              >

                <span>
                  Virtual GP consultation
                </span>

                <strong>
                  {originalAmount}
                </strong>

              </div>


              {hasDiscount && (

                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: "20px",
                    marginBottom:
                      "12px",
                    color: "#16803c",
                  }}
                >

                  <span>
                    Promotion discount
                  </span>

                  <strong>
                    -{discountAmount}
                  </strong>

                </div>
              )}


              <div
                style={{
                  borderTop:
                    "1px solid #dfe7e3",
                  margin:
                    "16px 0",
                }}
              />


              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: "20px",
                  fontSize: "20px",
                }}
              >

                <strong>
                  Amount paid
                </strong>

                <strong>
                  {finalAmount}
                </strong>

              </div>

            </div>


            {/* CARESCRIBER STATUS */}

            {referralSubmitted ? (

              <div
                style={{
                  marginTop: "28px",
                  padding: "22px",
                  background: "#efffeb",
                  border:
                    "1px solid #39ff14",
                  borderRadius: "16px",
                }}
              >

                <strong
                  style={{
                    fontSize: "18px",
                  }}
                >
                  Consultation submitted
                </strong>


                <p
                  style={{
                    margin:
                      "8px 0 0",
                    lineHeight: 1.6,
                  }}
                >
                  Your Virtual GP
                  consultation has been
                  submitted to the
                  CareScriber Virtual
                  Consult Inbox.
                </p>


                {referralCode && (

                  <p
                    style={{
                      margin:
                        "12px 0 0",
                      fontWeight: 700,
                    }}
                  >
                    Referral:{" "}
                    {referralCode}
                  </p>

                )}

              </div>

            ) : (

              <div
                style={{
                  marginTop: "28px",
                  padding: "22px",
                  background: "#fff8e8",
                  border:
                    "1px solid #e6a700",
                  borderRadius: "16px",
                }}
              >

                <strong
                  style={{
                    fontSize: "18px",
                  }}
                >
                  Payment verified —
                  referral pending
                </strong>


                <p
                  style={{
                    margin:
                      "8px 0 0",
                    lineHeight: 1.6,
                  }}
                >
                  Your payment was
                  verified, but the
                  Virtual GP referral
                  could not yet be
                  confirmed in the
                  CareScriber inbox.
                </p>


                {referralError && (

                  <p
                    style={{
                      margin:
                        "12px 0 0",
                      fontSize: "13px",
                      color: "#8a5a00",
                    }}
                  >
                    {referralError}
                  </p>

                )}

              </div>

            )}


            {/* STRIPE STATUS */}

            <div
              style={{
                marginTop: "20px",
                padding: "15px",
                background: "#f6f7f6",
                borderRadius: "12px",
                fontSize: "14px",
                color: "#66756f",
              }}
            >

              Stripe payment status:{" "}

              <strong>
                {paymentStatus}
              </strong>

            </div>


            {referralSubmitted && (

              <p
                style={{
                  marginTop: "25px",
                  fontSize: "14px",
                  color: "#74847e",
                  lineHeight: 1.6,
                }}
              >
                Your request is now in
                the Virtual GP queue.
                You may safely close
                this page.
              </p>

            )}

          </>

        ) : (

          <>

            {/* NOT VERIFIED */}

            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "#fff1f1",
                display: "flex",
                alignItems: "center",
                justifyContent:
                  "center",
                fontSize: "32px",
                fontWeight: 900,
                color: "#a43b3b",
                marginBottom: "25px",
              }}
            >
              !
            </div>


            <h1
              style={{
                margin:
                  "0 0 15px",
                fontSize:
                  "clamp(30px, 7vw, 36px)",
              }}
            >
              Payment not verified
            </h1>


            <p
              style={{
                lineHeight: 1.6,
                color: "#536860",
              }}
            >
              {errorMessage ||
                "Stripe has not confirmed this payment as paid. Your Virtual GP request has not been submitted."}
            </p>


            {paymentStatus && (

              <div
                style={{
                  marginTop: "20px",
                  padding: "15px",
                  background:
                    "#f6f7f6",
                  borderRadius: "12px",
                  fontSize: "14px",
                }}
              >

                Stripe payment status:{" "}

                <strong>
                  {paymentStatus}
                </strong>

              </div>

            )}


            <Link
              href="/assessment/virtual-gp"
              style={{
                display: "block",
                marginTop: "28px",
                background: "#39ff14",
                color: "#17352d",
                padding: "17px 20px",
                borderRadius: "14px",
                textAlign: "center",
                textDecoration: "none",
                fontWeight: 800,
              }}
            >
              Return to Virtual GP
            </Link>

          </>

        )}

      </div>

    </main>
  );
}
