"use client";

import {
  useEffect,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";

export default function PaymentSuccessPage() {
  const searchParams = useSearchParams();

  const sessionId =
    searchParams.get("session_id");

  const [status, setStatus] =
    useState<
      "checking" | "paid" | "failed"
    >("checking");

  useEffect(() => {
    async function verifyPayment() {
      if (!sessionId) {
        setStatus("failed");
        return;
      }

      try {
        const response = await fetch(
          `/api/stripe/verify?session_id=${encodeURIComponent(
            sessionId
          )}`
        );

        const data =
          await response.json();

        if (
          response.ok &&
          data.paid === true
        ) {
          setStatus("paid");

          sessionStorage.setItem(
            "hivclintest_payment",
            JSON.stringify({
              session_id: sessionId,
              status: "paid",
              verified_at:
                new Date().toISOString(),
            })
          );

          return;
        }

        setStatus("failed");
      } catch (error) {
        console.error(error);
        setStatus("failed");
      }
    }

    verifyPayment();
  }, [sessionId]);

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f7faf8",
        padding: "60px 20px",
        fontFamily: "Arial, sans-serif",
      }}
    >
      <div
        style={{
          maxWidth: "650px",
          margin: "0 auto",
          background: "white",
          borderRadius: "22px",
          padding: "40px",
          boxShadow:
            "0 10px 35px rgba(0,0,0,0.08)",
        }}
      >
        {status === "checking" && (
          <>
            <h1>
              Verifying payment
            </h1>

            <p>
              Please wait while we confirm
              your R250 payment.
            </p>
          </>
        )}

        {status === "paid" && (
          <>
            <div
              style={{
                fontSize: "48px",
                marginBottom: "15px",
              }}
            >
              ✓
            </div>

            <h1>
              Payment successful
            </h1>

            <p>
              Your R250 Virtual GP
              consultation payment has
              been verified.
            </p>

            <div
              style={{
                marginTop: "25px",
                padding: "18px",
                borderRadius: "14px",
                background: "#eaffdf",
              }}
            >
              <strong>
                Consultation request ready
              </strong>

              <p
                style={{
                  marginBottom: 0,
                }}
              >
                Your consultation can now
                be securely submitted to
                the Virtual Consult Inbox.
              </p>
            </div>
          </>
        )}

        {status === "failed" && (
          <>
            <h1>
              Payment not verified
            </h1>

            <p>
              We could not confirm the
              payment. Your consultation
              has not been submitted.
            </p>

            <a
              href="/assessment/virtual-gp"
              style={{
                display: "inline-block",
                marginTop: "20px",
                padding: "14px 22px",
                background: "#39ff14",
                color: "#12372a",
                borderRadius: "12px",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Return to consultation
            </a>
          </>
        )}
      </div>
    </main>
  );
}
