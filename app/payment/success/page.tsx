
import Link from "next/link";
import Stripe from "stripe";
import { createClient } from "@supabase/supabase-js";
import { randomInt } from "node:crypto";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

const REFERRAL_TABLE = "symptomai_referrals";

function getSupabaseAdmin() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error(
      "Supabase server credentials are missing."
    );
  }

  return createClient(url, key, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
}

function generateConsentToken(): string {
  return randomInt(0, 1000000)
    .toString()
    .padStart(6, "0");
}

function formatRand(cents: number): string {
  return `R${(cents / 100).toFixed(2)}`;
}

type Referral = {
  id: string;
  referral_code: string | null;
  consent_token: string | null;
  queue_status: string | null;
  referral_status: string | null;
  stripe_session_id: string | null;
  submitted_at: string | null;
  paid_at: string | null;
};

const cardStyle: React.CSSProperties = {
  marginTop: 24,
  padding: 22,
  borderRadius: 16,
};

export default async function PaymentSuccessPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  let paid = false;
  let paymentStatus = "";

  let amountSubtotal = 0;
  let amountDiscount = 0;
  let amountTotal = 0;

  let customerEmail = "";
  let customerName = "";

  let referralSubmitted = false;
  let referralCode = "";
  let consentToken = "";

  let errorMessage = "";
  let referralError = "";

  if (!sessionId) {
    errorMessage =
      "No Stripe payment session was provided.";
  } else if (!process.env.STRIPE_SECRET_KEY) {
    errorMessage =
      "Stripe has not been configured.";
  } else {
    try {
      const stripe = new Stripe(
        process.env.STRIPE_SECRET_KEY
      );

      // Verify the checkout directly with Stripe.
      const session =
        await stripe.checkout.sessions.retrieve(
          sessionId
        );

      paymentStatus = session.payment_status;

      paid =
        session.payment_status === "paid" ||
        session.payment_status ===
          "no_payment_required";

      amountSubtotal = session.amount_subtotal || 0;

      amountDiscount =
        session.total_details?.amount_discount || 0;

      amountTotal = session.amount_total || 0;

      customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        "";

      customerName =
        session.customer_details?.name || "";

      if (paid) {
        try {
          const supabase = getSupabaseAdmin();

          const now = new Date().toISOString();

          // Find the referral linked to this checkout.
          // Do not use email-only matching because
          // multiple referrals can share an email.

          const metadataReferralId =
            session.metadata?.referral_id ||
            session.metadata?.referralId ||
            "";

          const metadataReferralCode =
            session.metadata?.referral_code ||
            session.metadata?.referralCode ||
            "";

          let referral: Referral | null = null;

          const bySession = await supabase
            .from(REFERRAL_TABLE)
            .select("*")
            .eq("stripe_session_id", session.id)
            .maybeSingle();

          if (bySession.error) {
            throw new Error(
              `Session lookup failed: ${
                bySession.error.message
              }`
            );
          }

          referral = bySession.data as Referral | null;

          // Fallback to Stripe metadata.
          if (!referral && metadataReferralId) {
            const byId = await supabase
              .from(REFERRAL_TABLE)
              .select("*")
              .eq("id", metadataReferralId)
              .maybeSingle();

            if (byId.error) {
              throw new Error(byId.error.message);
            }

            referral = byId.data as Referral | null;
          }

          if (!referral && metadataReferralCode) {
            const byCode = await supabase
              .from(REFERRAL_TABLE)
              .select("*")
              .eq(
                "referral_code",
                metadataReferralCode
              )
              .maybeSingle();

            if (byCode.error) {
              throw new Error(byCode.error.message);
            }

            referral = byCode.data as Referral | null;
          }

          if (!referral) {
            referralError =
              "Payment verified, but the matching " +
              "referral could not be located. " +
              "Please contact support.";
          } else {
            // Never associate a referral with
            // a different Stripe checkout.
            if (
              referral.stripe_session_id &&
              referral.stripe_session_id !== session.id
            ) {
              throw new Error(
                "This referral is linked to another checkout."
              );
            }

            // Avoid resetting referrals already
            // accepted or completed by a doctor.
            const existingQueueStatus =
              referral.queue_status || "";

            const existingReferralStatus =
              referral.referral_status || "";

            const alreadyProcessed =
              ["accepted", "completed"].includes(
                existingQueueStatus
              ) ||
              ["accepted", "completed"].includes(
                existingReferralStatus
              );

            // Reuse existing consent tokens.
            // Generate only when missing.
            const token =
              referral.consent_token ||
              generateConsentToken();

            const updates: Record<
              string,
              string | number
            > = {
              payment_status: "paid",
              payment_amount: amountTotal,
              payment_currency: (
                session.currency || "zar"
              ).toUpperCase(),
              stripe_session_id: session.id,
              consent_token: token,
              updated_at: now,
            };

            if (!referral.paid_at) {
              updates.paid_at = now;
            }

            if (!referral.submitted_at) {
              updates.submitted_at = now;
            }

            if (!alreadyProcessed) {
              updates.queue_status = "waiting";
              updates.referral_status = "pending";
            }

            // Conditional update prevents a
            // different checkout claiming this
            // referral between lookup and update.
            let updateQuery = supabase
              .from(REFERRAL_TABLE)
              .update(updates)
              .eq("id", referral.id);

            if (referral.stripe_session_id) {
              updateQuery = updateQuery.eq(
                "stripe_session_id",
                session.id
              );
            } else {
              updateQuery =
                updateQuery.is(
                  "stripe_session_id",
                  null
                );
            }

            const result = await updateQuery
              .select("*")
              .maybeSingle();

            if (result.error) {
              throw new Error(
                result.error.message
              );
            }

            if (!result.data) {
              throw new Error(
                "Referral was changed by another " +
                "request. Please refresh."
              );
            }

            const updated = result.data as Referral;

            referralCode =
              updated.referral_code || "";

            consentToken =
              updated.consent_token || "";

            referralSubmitted =
              Boolean(
                referralCode &&
                /^\d{6}$/.test(consentToken)
              );

            if (!referralSubmitted) {
              referralError =
                "Referral updated, but the code " +
                "or consent token is missing.";
            }
          }
        } catch (error) {
          console.error(
            "Referral processing error:",
            error
          );

          referralError =
            "Your payment was verified, but " +
            "we could not confirm your referral. " +
            "Please contact support.";
        }
      }
    } catch (error) {
      console.error(
        "Stripe verification failed:",
        error
      );

      errorMessage =
        "We could not verify your payment.";
    }
  }

  const originalAmount = formatRand(
    amountSubtotal || 25000
  );

  const discountAmount =
    formatRand(amountDiscount);

  const finalAmount = formatRand(amountTotal);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6faf7",
        padding: "40px 16px",
        fontFamily: "Arial, sans-serif",
        color: "#17352d",
      }}
    >
      <div
        style={{
          maxWidth: 650,
          margin: "0 auto",
          padding: "32px 24px",
          background: "white",
          borderRadius: 24,
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.08)",
        }}
      >
        {paid ? (
          <>
            <div
              style={{
                width: 65,
                height: 65,
                borderRadius: "50%",
                background: "#39ff14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: 34,
                fontWeight: 900,
                marginBottom: 20,
              }}
            >
              ✓
            </div>

            <p
              style={{
                fontWeight: 800,
                fontSize: 13,
                textTransform: "uppercase",
              }}
            >
              Payment verified
            </p>

            <h1>Virtual GP request</h1>

            <p>
              Your checkout has been successfully
              verified.
            </p>

            {(customerName || customerEmail) && (
              <div
                style={{
                  ...cardStyle,
                  background: "#f6f7f6",
                }}
              >
                {customerName && (
                  <p>
                    <strong>Patient:</strong>{" "}
                    {customerName}
                  </p>
                )}

                {customerEmail && (
                  <p>
                    <strong>Payment email:</strong>{" "}
                    {customerEmail}
                  </p>
                )}
              </div>
            )}

            <div
              style={{
                ...cardStyle,
                background: "#f8faf9",
                border: "1px solid #dfe7e3",
              }}
            >
              <h2>Payment summary</h2>

              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  gap: 12,
                }}
              >
                <span>
                  Virtual GP consultation
                </span>

                <strong>
                  {originalAmount}
                </strong>
              </div>

              {amountDiscount > 0 && (
                <div
                  style={{
                    display: "flex",
                    justifyContent:
                      "space-between",
                    gap: 12,
                    marginTop: 16,
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

              <hr
                style={{
                  margin: "22px 0",
                  border: 0,
                  borderTop:
                    "1px solid #dfe7e3",
                }}
              />

              <div
                style={{
                  display: "flex",
                  justifyContent:
                    "space-between",
                  gap: 12,
                  fontSize: 20,
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

            {referralSubmitted ? (
              <div
                style={{
                  ...cardStyle,
                  background: "#efffeb",
                  border:
                    "1px solid #39ff14",
                }}
              >
                <h2>
                  Consultation submitted
                </h2>

                <p
                  style={{
                    lineHeight: 1.6,
                  }}
                >
                  Your Virtual GP consultation
                  has been submitted to the
                  CareScriber Virtual Consult
                  Inbox.
                </p>

                <div
                  style={{
                    marginTop: 22,
                    padding: 18,
                    background: "white",
                    borderRadius: 12,
                    overflowWrap: "anywhere",
                  }}
                >
                  <p>
                    <strong>
                      Referral code
                    </strong>
                  </p>

                  <p
                    style={{
                      fontSize: 23,
                      fontWeight: 800,
                    }}
                  >
                    {referralCode}
                  </p>

                  <hr />

                  <p>
                    <strong>
                      Patient consent token
                    </strong>
                  </p>

                  <p
                    style={{
                      fontSize: 30,
                      fontWeight: 900,
                      letterSpacing: 4,
                      color: "#047857",
                    }}
                  >
                    {consentToken}
                  </p>
                </div>

                <p
                  style={{
                    fontSize: 14,
                    lineHeight: 1.6,
                    marginTop: 20,
                  }}
                >
                  Keep your consent token
                  private. Only share it with
                  your treating healthcare
                  professional when you
                  consent to opening your
                  referral.
                </p>
              </div>
            ) : (
              <div
                role="alert"
                style={{
                  ...cardStyle,
                  background: "#fff8e8",
                  border:
                    "1px solid #e6a700",
                }}
              >
                <h2>
                  Payment verified —
                  referral pending
                </h2>

                <p>
                  Your payment has been
                  verified, but your referral
                  could not yet be confirmed.
                </p>

                {referralError && (
                  <p>{referralError}</p>
                )}
              </div>
            )}

            <div
              style={{
                ...cardStyle,
                background: "#f6f7f6",
                fontSize: 14,
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
                  marginTop: 24,
                  color: "#66756f",
                  lineHeight: 1.6,
                }}
              >
                Your request is in the
                Virtual GP queue. Save your
                referral code and consent
                token before closing this
                page.
              </p>
            )}
          </>
        ) : (
          <>
            <h1>
              Payment not verified
            </h1>

            <p>
              {errorMessage ||
                "Stripe has not confirmed this payment."}
            </p>

            {paymentStatus && (
              <p>
                Stripe status:{" "}
                <strong>
                  {paymentStatus}
                </strong>
              </p>
            )}

            <Link
              href="/assessment/virtual-gp"
              style={{
                display: "block",
                marginTop: 28,
                background: "#39ff14",
                padding: 18,
                borderRadius: 14,
                textAlign: "center",
                textDecoration: "none",
                color: "#17352d",
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
