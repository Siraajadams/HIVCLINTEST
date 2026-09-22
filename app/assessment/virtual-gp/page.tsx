"use client";

import { useEffect, useMemo, useState } from "react";
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

type PatientDetails = {
  firstName: string;
  surname: string;
  email: string;
  mobile: string;
  idNumber: string;
  dateOfBirth: string;
  gender: string;
};

const CONSULTATION_FEE = 250;

const consultationReasons = [
  {
    value: "PEP Assessment",
    label: "PEP Assessment",
    description: "Possible HIV exposure within the last 72 hours",
  },
  {
    value: "PrEP Consultation",
    label: "PrEP Consultation",
    description: "Discuss starting or continuing HIV prevention",
  },
  {
    value: "HIV Test Review",
    label: "HIV Test Review",
    description: "Discuss an HIV self-test result with a GP",
  },
  {
    value: "Sexual Health Consultation",
    label: "Sexual Health Consultation",
    description: "Discuss symptoms, STI concerns or sexual health",
  },
  {
    value: "Other",
    label: "Other",
    description: "Other HIV or sexual-health concern",
  },
];

export default function VirtualGPPage() {
  const [assessment, setAssessment] = useState<Assessment | null>(null);

  const [patient, setPatient] = useState<PatientDetails>({
    firstName: "",
    surname: "",
    email: "",
    mobile: "",
    idNumber: "",
    dateOfBirth: "",
    gender: "",
  });

  const [consultationReason, setConsultationReason] = useState("");
  const [consent, setConsent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  /*
   * ---------------------------------------------------------
   * LOAD EXISTING ASSESSMENT
   * ---------------------------------------------------------
   */

  useEffect(() => {
    try {
      const savedAssessment = sessionStorage.getItem(
        "hivclintest_assessment"
      );

      if (savedAssessment) {
        const parsed: Assessment = JSON.parse(savedAssessment);

        setAssessment(parsed);

        /*
         * Automatically suggest PEP consultation
         * when assessment has identified urgent exposure.
         */
        if (parsed.pepUrgent) {
          setConsultationReason("PEP Assessment");
        } else if (parsed.prepInterest === "yes") {
          setConsultationReason("PrEP Consultation");
        }
      }

      /*
       * If registration details were stored previously,
       * load them here.
       */
      const savedPatient =
        sessionStorage.getItem("hivclintest_patient");

      if (savedPatient) {
        const parsedPatient = JSON.parse(savedPatient);

        setPatient((current) => ({
          ...current,
          ...parsedPatient,
        }));
      }
    } catch (err) {
      console.error("Unable to load saved information:", err);
    }
  }, []);

  /*
   * ---------------------------------------------------------
   * ASSESSMENT SUMMARY
   * ---------------------------------------------------------
   */

  const pepUrgent = assessment?.pepUrgent === true;

  const symptomCount = useMemo(() => {
    if (!assessment?.symptoms) return 0;

    const symptoms = assessment.symptoms;

    return [
      symptoms.genitalSore,
      symptoms.discharge,
      symptoms.painfulUrination,
      symptoms.genitalRash,
    ].filter(Boolean).length;
  }, [assessment]);

  const riskCount = useMemo(() => {
    if (!assessment?.risk) return 0;

    const risk = assessment.risk;

    return [
      risk.condomlessSex,
      risk.multiplePartners,
      risk.partnerPositive,
      risk.partnerUnknown,
      risk.recentSTI,
    ].filter(Boolean).length;
  }, [assessment]);

  /*
   * ---------------------------------------------------------
   * PATIENT FORM
   * ---------------------------------------------------------
   */

  function updatePatient(
    field: keyof PatientDetails,
    value: string
  ) {
    setPatient((current) => ({
      ...current,
      [field]: value,
    }));
  }

  /*
   * ---------------------------------------------------------
   * VALIDATION
   * ---------------------------------------------------------
   */

  const formValid =
    patient.firstName.trim() !== "" &&
    patient.surname.trim() !== "" &&
    patient.email.trim() !== "" &&
    patient.mobile.trim() !== "" &&
    consultationReason !== "" &&
    consent;

  /*
   * ---------------------------------------------------------
   * PAYMENT
   * ---------------------------------------------------------
   *
   * IMPORTANT:
   *
   * We DO NOT send the patient to CareScriber yet.
   *
   * Correct flow:
   *
   * 1. Save referral information
   * 2. Create Stripe Checkout
   * 3. Patient pays
   * 4. Stripe confirms payment
   * 5. Server verifies payment
   * 6. THEN send referral to CareScriber inbox
   *
   * This prevents unpaid referrals appearing in CareScriber.
   */

  async function startPayment() {
    setError("");

    if (!formValid) {
      setError(
        "Please complete the required fields, select a consultation reason and accept the consent statement."
      );
      return;
    }

    try {
      setLoading(true);

      const updatedAssessment: Assessment = {
        ...(assessment || {}),
        carePreference: "Virtual GP",
        consultationReason,
        consultationFee: CONSULTATION_FEE,
      };

      /*
       * Save locally so that we can recover the journey
       * after returning from Stripe.
       */

      sessionStorage.setItem(
        "hivclintest_assessment",
        JSON.stringify(updatedAssessment)
      );

      sessionStorage.setItem(
        "hivclintest_patient",
        JSON.stringify(patient)
      );

      const referralPayload = {
        source: "HIVClinTest",

        patient: {
          firstName: patient.firstName.trim(),
          surname: patient.surname.trim(),
          email: patient.email.trim(),
          mobile: patient.mobile.trim(),
          idNumber: patient.idNumber.trim(),
          dateOfBirth: patient.dateOfBirth,
          gender: patient.gender,
        },

        consultation: {
          reason: consultationReason,
          fee: CONSULTATION_FEE,
          currency: "ZAR",
        },

        assessment: updatedAssessment,

        createdAt: new Date().toISOString(),
      };

      /*
       * Store a copy of exactly what should eventually
       * be sent to CareScriber.
       */

      sessionStorage.setItem(
        "hivclintest_pending_referral",
        JSON.stringify(referralPayload)
      );

      /*
       * -----------------------------------------------------
       * CALL CHECKOUT API
       * -----------------------------------------------------
       */

      const response = await fetch(
        "/api/create-checkout-session",
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(referralPayload),
        }
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to start the payment process."
        );
      }

      /*
       * API should return:
       *
       * {
       *   url: "https://checkout.stripe.com/..."
       * }
       */

      if (!data?.url) {
        throw new Error(
          "Stripe Checkout URL was not returned."
        );
      }

      window.location.href = data.url;
    } catch (err) {
      console.error("Payment error:", err);

      setError(
        err instanceof Error
          ? err.message
          : "Unable to start payment. Please try again."
      );

      setLoading(false);
    }
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "linear-gradient(180deg, #f7fffb 0%, #ffffff 55%, #f8fafc 100%)",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        color: "#102a2a",
        padding: "40px 18px 80px",
      }}
    >
      <div
        style={{
          maxWidth: "820px",
          margin: "0 auto",
        }}
      >
        {/* HEADER */}

        <div
          style={{
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "1.5px",
              color: "#0f766e",
              marginBottom: "10px",
            }}
          >
            HIVCLINTEST
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "36px",
              lineHeight: 1.15,
              fontWeight: 900,
              color: "#17324d",
            }}
          >
            Virtual GP Consultation
          </h1>

          <p
            style={{
              marginTop: "12px",
              marginBottom: 0,
              fontSize: "17px",
              lineHeight: 1.6,
              color: "#64748b",
            }}
          >
            Speak privately with a GP about HIV prevention,
            PEP, PrEP, your HIV test or sexual health.
          </p>
        </div>

        {/* PEP URGENT MESSAGE */}

        {pepUrgent && (
          <div
            style={{
              border: "2px solid #ef4444",
              background: "#fff7f7",
              borderRadius: "18px",
              padding: "22px",
              marginBottom: "24px",
            }}
          >
            <div
              style={{
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "1.5px",
                color: "#dc2626",
                marginBottom: "8px",
              }}
            >
              URGENT
            </div>

            <h2
              style={{
                margin: "0 0 8px",
                fontSize: "22px",
                color: "#991b1b",
              }}
            >
              Possible PEP assessment
            </h2>

            <p
              style={{
                margin: 0,
                lineHeight: 1.6,
                color: "#7f1d1d",
              }}
            >
              Your assessment indicates a possible recent HIV
              exposure. PEP is time-sensitive and should be
              started as soon as possible when clinically
              appropriate.
            </p>
          </div>
        )}

        {/* CONSULTATION CARD */}

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #dce7e5",
            borderRadius: "24px",
            padding: "28px",
            boxShadow:
              "0 12px 35px rgba(15, 118, 110, 0.08)",
            marginBottom: "22px",
          }}
        >
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              gap: "20px",
              alignItems: "flex-start",
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: "13px",
                  color: "#64748b",
                  fontWeight: 700,
                  marginBottom: "6px",
                }}
              >
                CONSULTATION FEE
              </div>

              <div
                style={{
                  fontSize: "38px",
                  fontWeight: 900,
                  color: "#17324d",
                }}
              >
                R250
              </div>

              <div
                style={{
                  color: "#64748b",
                  marginTop: "4px",
                }}
              >
                Virtual consultation with a GP
              </div>
            </div>

            <div
              style={{
                padding: "10px 16px",
                borderRadius: "999px",
                background: "#ecfdf5",
                color: "#047857",
                fontWeight: 800,
                fontSize: "13px",
              }}
            >
              Secure online consultation
            </div>
          </div>
        </section>

        {/* ASSESSMENT SUMMARY */}

        {assessment && (
          <section
            style={{
              background: "#f8fafc",
              border: "1px solid #e2e8f0",
              borderRadius: "20px",
              padding: "22px",
              marginBottom: "22px",
            }}
          >
            <h2
              style={{
                margin: "0 0 14px",
                fontSize: "19px",
                color: "#17324d",
              }}
            >
              Your assessment
            </h2>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(180px, 1fr))",
                gap: "12px",
              }}
            >
              <SummaryItem
                label="Exposure"
                value={
                  assessment.exposureTiming ||
                  "Not specified"
                }
              />

              <SummaryItem
                label="Risk indicators"
                value={String(riskCount)}
              />

              <SummaryItem
                label="Symptoms reported"
                value={String(symptomCount)}
              />
            </div>
          </section>
        )}

        {/* PATIENT DETAILS */}

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #dce7e5",
            borderRadius: "24px",
            padding: "28px",
            marginBottom: "22px",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "23px",
              color: "#17324d",
            }}
          >
            Your details
          </h2>

          <p
            style={{
              margin: "0 0 24px",
              color: "#64748b",
              lineHeight: 1.5,
            }}
          >
            The GP will use these details to contact you.
          </p>

          <div
            style={{
              display: "grid",
              gridTemplateColumns:
                "repeat(auto-fit, minmax(240px, 1fr))",
              gap: "18px",
            }}
          >
            <InputField
              label="First name *"
              value={patient.firstName}
              onChange={(value) =>
                updatePatient("firstName", value)
              }
            />

            <InputField
              label="Surname *"
              value={patient.surname}
              onChange={(value) =>
                updatePatient("surname", value)
              }
            />

            <InputField
              label="Email *"
              type="email"
              value={patient.email}
              onChange={(value) =>
                updatePatient("email", value)
              }
            />

            <InputField
              label="Mobile number *"
              type="tel"
              value={patient.mobile}
              onChange={(value) =>
                updatePatient("mobile", value)
              }
            />

            <InputField
              label="ID / Passport number"
              value={patient.idNumber}
              onChange={(value) =>
                updatePatient("idNumber", value)
              }
            />

            <InputField
              label="Date of birth"
              type="date"
              value={patient.dateOfBirth}
              onChange={(value) =>
                updatePatient("dateOfBirth", value)
              }
            />

            <div>
              <label style={labelStyle}>
                Gender
              </label>

              <select
                value={patient.gender}
                onChange={(event) =>
                  updatePatient(
                    "gender",
                    event.target.value
                  )
                }
                style={inputStyle}
              >
                <option value="">
                  Select gender
                </option>
                <option value="Female">
                  Female
                </option>
                <option value="Male">
                  Male
                </option>
                <option value="Other">
                  Other
                </option>
                <option value="Prefer not to say">
                  Prefer not to say
                </option>
              </select>
            </div>
          </div>
        </section>

        {/* CONSULTATION REASON */}

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #dce7e5",
            borderRadius: "24px",
            padding: "28px",
            marginBottom: "22px",
          }}
        >
          <h2
            style={{
              margin: "0 0 8px",
              fontSize: "23px",
              color: "#17324d",
            }}
          >
            What would you like help with?
          </h2>

          <p
            style={{
              margin: "0 0 20px",
              color: "#64748b",
            }}
          >
            Select the main reason for your consultation.
          </p>

          <div
            style={{
              display: "grid",
              gap: "12px",
            }}
          >
            {consultationReasons.map((reason) => {
              const selected =
                consultationReason === reason.value;

              return (
                <button
                  key={reason.value}
                  type="button"
                  onClick={() =>
                    setConsultationReason(
                      reason.value
                    )
                  }
                  style={{
                    width: "100%",
                    textAlign: "left",
                    padding: "18px",
                    borderRadius: "16px",
                    cursor: "pointer",
                    background: selected
                      ? "#ecfdf5"
                      : "#ffffff",
                    border: selected
                      ? "2px solid #10b981"
                      : "1px solid #dbe4e6",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      gap: "13px",
                      alignItems: "flex-start",
                    }}
                  >
                    <div
                      style={{
                        width: "20px",
                        height: "20px",
                        borderRadius: "50%",
                        border: selected
                          ? "6px solid #10b981"
                          : "2px solid #94a3b8",
                        boxSizing: "border-box",
                        marginTop: "2px",
                        flexShrink: 0,
                      }}
                    />

                    <div>
                      <div
                        style={{
                          fontSize: "16px",
                          fontWeight: 800,
                          color: "#17324d",
                        }}
                      >
                        {reason.label}
                      </div>

                      <div
                        style={{
                          marginTop: "4px",
                          fontSize: "14px",
                          lineHeight: 1.4,
                          color: "#64748b",
                        }}
                      >
                        {reason.description}
                      </div>
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        {/* CONSENT */}

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #dce7e5",
            borderRadius: "20px",
            padding: "22px",
            marginBottom: "22px",
          }}
        >
          <label
            style={{
              display: "flex",
              gap: "14px",
              cursor: "pointer",
              alignItems: "flex-start",
            }}
          >
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) =>
                setConsent(event.target.checked)
              }
              style={{
                width: "20px",
                height: "20px",
                marginTop: "2px",
                accentColor: "#10b981",
              }}
            />

            <span
              style={{
                lineHeight: 1.55,
                color: "#475569",
                fontSize: "14px",
              }}
            >
              I consent to my information and HIVClinTest
              assessment being shared securely with the
              healthcare provider for the purpose of arranging
              and conducting this consultation.
            </span>
          </label>
        </section>

        {/* ERROR */}

        {error && (
          <div
            style={{
              padding: "16px 18px",
              borderRadius: "14px",
              background: "#fef2f2",
              border: "1px solid #fecaca",
              color: "#b91c1c",
              fontWeight: 700,
              marginBottom: "18px",
              lineHeight: 1.5,
            }}
          >
            {error}
          </div>
        )}

        {/* PAYMENT */}

        <button
          type="button"
          onClick={startPayment}
          disabled={loading}
          style={{
            width: "100%",
            border: "none",
            borderRadius: "18px",
            padding: "22px 20px",

            /*
             * SymptomAI-style neon green CTA
             */

            background: loading
              ? "#94a3b8"
              : "#39ff14",

            color: loading
              ? "#ffffff"
              : "#052e16",

            fontSize: "19px",
            fontWeight: 900,
            cursor: loading
              ? "not-allowed"
              : "pointer",

            boxShadow: loading
              ? "none"
              : "0 8px 25px rgba(57,255,20,0.30)",
          }}
        >
          {loading
            ? "Preparing secure payment..."
            : "Pay R250 & Request Virtual GP"}
        </button>

        <div
          style={{
            textAlign: "center",
            marginTop: "13px",
            color: "#64748b",
            fontSize: "13px",
            lineHeight: 1.5,
          }}
        >
          Secure payment. Your GP referral will only be
          submitted after payment has been confirmed.
        </div>

        {/* BACK */}

        <div
          style={{
            marginTop: "28px",
            textAlign: "center",
          }}
        >
          <Link
            href="/assessment"
            style={{
              color: "#0f766e",
              fontWeight: 800,
              textDecoration: "none",
            }}
          >
            ← Back to assessment
          </Link>
        </div>

        {/* DISCLAIMER */}

        <div
          style={{
            marginTop: "38px",
            paddingTop: "22px",
            borderTop: "1px solid #e2e8f0",
            textAlign: "center",
            color: "#94a3b8",
            fontSize: "12px",
            lineHeight: 1.6,
          }}
        >
          HIVClinTest provides digital health support and does
          not replace emergency medical care. If you are
          seriously unwell or require urgent assistance, seek
          appropriate emergency medical care.
        </div>
      </div>
    </main>
  );
}

/*
 * -----------------------------------------------------------
 * SMALL COMPONENTS
 * -----------------------------------------------------------
 */

function SummaryItem({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div
      style={{
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "15px",
      }}
    >
      <div
        style={{
          fontSize: "11px",
          fontWeight: 800,
          color: "#94a3b8",
          letterSpacing: "0.7px",
          marginBottom: "5px",
        }}
      >
        {label.toUpperCase()}
      </div>

      <div
        style={{
          fontSize: "15px",
          fontWeight: 800,
          color: "#17324d",
        }}
      >
        {value}
      </div>
    </div>
  );
}

function InputField({
  label,
  value,
  onChange,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
}) {
  return (
    <div>
      <label style={labelStyle}>
        {label}
      </label>

      <input
        type={type}
        value={value}
        onChange={(event) =>
          onChange(event.target.value)
        }
        style={inputStyle}
      />
    </div>
  );
}

const labelStyle: React.CSSProperties = {
  display: "block",
  marginBottom: "7px",
  fontSize: "13px",
  fontWeight: 800,
  color: "#475569",
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: "14px 15px",
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  background: "#ffffff",
  color: "#0f172a",
  fontSize: "15px",
  outline: "none",
};
