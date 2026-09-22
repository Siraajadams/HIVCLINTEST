import Link from "next/link";
import Stripe from "stripe";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

type PageProps = {
  searchParams: Promise<{
    session_id?: string;
  }>;
};

export default async function PaymentSuccessPage({
  searchParams,
}: PageProps) {
  const params = await searchParams;
  const sessionId = params.session_id;

  let paid = false;
  let paymentStatus = "";
  let amountTotal = 0;
  let customerEmail = "";
  let errorMessage = "";

  if (!sessionId) {
    errorMessage = "No Stripe payment session was provided.";
  } else if (!process.env.STRIPE_SECRET_KEY) {
    errorMessage = "Stripe has not been configured on the server.";
  } else {
    try {
      const stripe = new Stripe(
        process.env.STRIPE_SECRET_KEY
      );

      const session =
        await stripe.checkout.sessions.retrieve(
          sessionId
        );

      paymentStatus =
        session.payment_status || "";

      paid =
        session.payment_status === "paid";

      amountTotal =
        session.amount_total || 0;

      customerEmail =
        session.customer_details?.email ||
        session.customer_email ||
        "";
    } catch (error) {
      console.error(
        "Stripe verification error:",
        error
      );

      errorMessage =
        "We could not verify your Stripe payment.";
    }
  }

  const amount =
    amountTotal > 0
      ? `R${(amountTotal / 100).toFixed(2)}`
      : "R250.00";

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
          boxShadow:
            "0 12px 40px rgba(0,0,0,0.08)",
        }}
      >
        {paid ? (
          <>
            <div
              style={{
                width: "70px",
                height: "70px",
                borderRadius: "50%",
                background: "#39ff14",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
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
                textTransform: "uppercase",
                fontSize: "13px",
                letterSpacing: "1px",
              }}
            >
              Payment verified
            </p>

            <h1
              style={{
                margin: "0 0 15px",
                fontSize: "36px",
              }}
            >
              Virtual GP request ready
            </h1>

            <p
              style={{
                fontSize: "18px",
                lineHeight: 1.6,
              }}
            >
              Your {amount} payment for your
              Virtual GP consultation has
              been successfully verified.
            </p>

            {customerEmail && (
              <p
                style={{
                  color: "#66756f",
                }}
              >
                Payment confirmation:
                {" "}
                <strong>
                  {customerEmail}
                </strong>
              </p>
            )}

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
                Payment successful
              </strong>

              <p
                style={{
                  marginBottom: 0,
                  lineHeight: 1.6,
                }}
              >
                Your consultation can now
                be submitted to the
                CareScriber Virtual Consult
                Inbox.
              </p>
            </div>

            <div
              style={{
                marginTop: "25px",
                padding: "16px",
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
          </>
        ) : (
          <>
            <h1
              style={{
                marginTop: 0,
              }}
            >
              Payment not verified
            </h1>

            <p
              style={{
                lineHeight: 1.6,
              }}
            >
              {errorMessage ||
                "Stripe has not confirmed this payment as paid. Your Virtual GP request has not been submitted."}
            </p>

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
