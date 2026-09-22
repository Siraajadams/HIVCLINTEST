"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

type Assessment = {
  exposureTiming?: string;
  prepInterest?: string;
  pepUrgent?: boolean;

  risk?: {
    condomlessSex?: boolean;
    multiplePartners?: boolean;
    partnerPositive?: boolean;
    partnerUnknown?: boolean;
    recentSTI?: boolean;
    none?: boolean;
  };

  symptoms?: {
    genitalSore?: boolean;
    discharge?: boolean;
    painfulUrination?: boolean;
    genitalRash?: boolean;
    none?: boolean;
  };

  carePreference?: string;
  consultationReason?: string;
  consultationFee?: number;
};

export default function VirtualGPPage() {
  const [assessment, setAssessment] =
    useState<Assessment | null>(null);

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    try {
      const savedAssessment =
        sessionStorage.getItem(
          "hivclintest_assessment"
        );

      if (savedAssessment) {
        setAssessment(
          JSON.parse(savedAssessment)
        );
      }
    } catch (error) {
      console.error(
        "Unable to load assessment:",
        error
      );
    }
  }, []);

  const pepUrgent =
    assessment?.pepUrgent === true;

  const symptoms =
    assessment?.symptoms;

  const symptomCount = symptoms
    ? [
        symptoms.genitalSore,
        symptoms.discharge,
        symptoms.painfulUrination,
        symptoms.genitalRash,
      ].filter(Boolean).length
    : 0;

  const startPayment = () => {
    try {
      setLoading(true);

      /*
       * Save the consultation selection.
       *
       * Later we will use this information when:
       *
       * 1. Stripe payment is completed
       * 2. Payment is verified
       * 3. Referral is created
       * 4. Referral is sent to the CareScriber inbox
       */

      const existingAssessment =
        sessionStorage.getItem(
          "hivclintest_assessment"
        );

      let updatedAssessment: Assessment = {};

      if (existingAssessment) {
        try {
          updatedAssessment =
            JSON.parse(existingAssessment);
        } catch {
          updatedAssessment = {};
        }
      }

      updatedAssessment.carePreference =
        "virtual_gp";

      updatedAssessment.consultationReason =
        pepUrgent
          ? "HIV PEP assessment"
          : "HIV PrEP consultation";

      updatedAssessment.consultationFee =
        250;

      sessionStorage.setItem(
        "hivclintest_assessment",
        JSON.stringify(updatedAssessment)
      );

      /*
       * NEXT STEP:
       *
       * We will create:
       *
       * /assessment/virtual-gp/payment
       *
       * That page will start the Stripe checkout.
       */

      window.location.href =
        "/assessment/virtual-gp/payment";
    } catch (error) {
      console.error(
        "Unable to continue:",
        error
      );

      setLoading(false);
    }
  };

  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link
          className="brand"
          href="/"
        >
          <span className="brand-mark">
            +
          </span>{" "}
          HIVClinTest
        </Link>

        <div className="confidential">
          Private and confidential
        </div>
      </header>

      <section className="flow-shell">
        <Link
          className="back-link"
          href="/assessment?exposure=yes"
        >
          ← Back
        </Link>

        <p className="eyebrow">
          VIRTUAL CARE
        </p>

        <h1>
          Virtual GP consultation
        </h1>

        <p className="flow-subtitle">
          Speak privately with a GP online
          about HIV prevention and your
          next steps.
        </p>

        {pepUrgent && (
          <div
            style={{
              marginTop: "24px",
              padding: "22px",
              border:
                "1px solid #ef4444",
              borderRadius: "18px",
              background: "#fff7f7",
            }}
          >
            <p
              style={{
                margin: 0,
                fontSize: "13px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                color: "#b42318",
              }}
            >
              URGENT
            </p>

            <h2
              style={{
                marginTop: "8px",
                marginBottom: "10px",
              }}
            >
              You may need PEP
            </h2>

            <p
              style={{
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              You reported a possible HIV
              exposure within the last 72
              hours. PEP should be assessed
              as soon as possible and started
              within 72 hours when clinically
              appropriate.
            </p>
          </div>
        )}

        <div
          style={{
            marginTop: "28px",
            padding: "26px",
            border:
              "1px solid #d9e2df",
            borderRadius: "20px",
            background: "#ffffff",
          }}
        >
          <p
            style={{
              margin: 0,
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "0.08em",
              color: "#0f766e",
            }}
          >
            YOUR CONSULTATION
          </p>

          <h2
            style={{
              marginTop: "10px",
              marginBottom: "10px",
            }}
          >
            {pepUrgent
              ? "HIV PEP assessment"
              : "HIV PrEP consultation"}
          </h2>

          <p
            style={{
              lineHeight: 1.6,
            }}
          >
            A registered GP will review
            your information and conduct a
            private virtual consultation.
          </p>

          {symptomCount > 0 && (
            <p
              style={{
                lineHeight: 1.6,
              }}
            >
              Your assessment also indicates{" "}
              <strong>
                {symptomCount} symptom
                {symptomCount === 1
                  ? ""
                  : "s"}
              </strong>{" "}
              that can be discussed during
              your consultation.
            </p>
          )}

          <div
            style={{
              marginTop: "22px",
              padding: "18px",
              borderRadius: "16px",
              background: "#f5f7f6",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "20px",
              }}
            >
              <span>
                Virtual GP consultation
              </span>

              <strong
                style={{
                  fontSize: "22px",
                }}
              >
                R250
              </strong>
            </div>
          </div>
        </div>

        <div
          style={{
            marginTop: "24px",
            padding: "22px",
            borderRadius: "18px",
            background: "#f8faf9",
          }}
        >
          <h3
            style={{
              marginTop: 0,
            }}
          >
            What happens next?
          </h3>

          <p
            style={{
              marginBottom: "8px",
              lineHeight: 1.6,
            }}
          >
            1. Pay securely for your
            consultation.
          </p>

          <p
            style={{
              marginBottom: "8px",
              lineHeight: 1.6,
            }}
          >
            2. Your payment will be
            confirmed.
          </p>

          <p
            style={{
              marginBottom: "8px",
              lineHeight: 1.6,
            }}
          >
            3. Your referral will be sent
            securely to the CareScriber
            Virtual Consult Inbox.
          </p>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.6,
            }}
          >
            4. A GP will review your
            referral and contact you.
          </p>
        </div>

        <button
          type="button"
          onClick={startPayment}
          disabled={loading}
          style={{
            width: "100%",
            marginTop: "28px",
            padding: "19px 24px",
            border: "none",
            borderRadius: "16px",

            /*
             * Neon green similar to the
             * SymptomAI virtual consult CTA
             */
            background: loading
              ? "#a3e635"
              : "#7CFC00",

            color: "#12372a",
            fontSize: "18px",
            fontWeight: 800,
            cursor: loading
              ? "wait"
              : "pointer",

            boxShadow:
              "0 8px 24px rgba(124,252,0,0.25)",
          }}
        >
          {loading
            ? "Please wait..."
            : "Pay R250 & Start Virtual GP Consultation"}
        </button>

        <p
          style={{
            marginTop: "18px",
            textAlign: "center",
            fontSize: "13px",
            color: "#667085",
            lineHeight: 1.5,
          }}
        >
          Payment does not guarantee a
          prescription. Treatment is subject
          to clinical assessment by the GP.
        </p>
      </section>
    </main>
  );
}
