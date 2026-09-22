"use client";

import {
  FormEvent,
  useEffect,
  useMemo,
  useState,
} from "react";
import Link from "next/link";

type Registration = {
  first_name: string;
  surname: string;
  email: string;
  gender: string;
  country: string;
  identity_type: string;
  identity_number: string;
  date_of_birth: string;
  mobile_number: string;
};

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

const emptyPatient: Registration = {
  first_name: "",
  surname: "",
  email: "",
  gender: "",
  country: "",
  identity_type: "",
  identity_number: "",
  date_of_birth: "",
  mobile_number: "",
};

const consultationReasons = [
  {
    value: "PEP assessment",
    title: "PEP assessment",
    description:
      "I may have had a recent HIV exposure.",
  },
  {
    value: "PrEP consultation",
    title: "PrEP consultation",
    description:
      "I would like to discuss HIV prevention and PrEP.",
  },
  {
    value: "HIV self-test support",
    title: "HIV self-test support",
    description:
      "I need help with my HIV self-test or result.",
  },
  {
    value: "HIV clinical consultation",
    title: "HIV clinical consultation",
    description:
      "I would like to speak to a GP about HIV-related care.",
  },
  {
    value: "Other",
    title: "Other",
    description:
      "I would like to discuss another concern with the GP.",
  },
];

export default function VirtualGPPage() {
  const [patient, setPatient] =
    useState<Registration>(emptyPatient);

  const [assessment, setAssessment] =
    useState<Assessment | null>(null);

  const [reason, setReason] = useState("");
  const [consent, setConsent] = useState(false);

  const [loaded, setLoaded] = useState(false);

  const [paymentLoading, setPaymentLoading] =
    useState(false);

  const [paymentError, setPaymentError] =
    useState("");

  // --------------------------------------------------
  // LOAD REGISTRATION + ASSESSMENT
  // --------------------------------------------------

  useEffect(() => {
    try {
      const savedRegistration =
        window.sessionStorage.getItem(
          "hivclintest_registration"
        );

      const savedAssessment =
        window.sessionStorage.getItem(
          "hivclintest_assessment"
        );

      console.log(
        "HIVClinTest saved registration:",
        savedRegistration
      );

      console.log(
        "HIVClinTest saved assessment:",
        savedAssessment
      );

      if (savedRegistration) {
        const parsed =
          JSON.parse(savedRegistration);

        setPatient({
          first_name:
            parsed.first_name ?? "",

          surname:
            parsed.surname ?? "",

          email:
            parsed.email ?? "",

          gender:
            parsed.gender ?? "",

          country:
            parsed.country ?? "",

          identity_type:
            parsed.identity_type ?? "",

          identity_number:
            parsed.identity_number ?? "",

          date_of_birth:
            parsed.date_of_birth ?? "",

          mobile_number:
            parsed.mobile_number ?? "",
        });
      }

      if (savedAssessment) {
        const parsedAssessment =
          JSON.parse(savedAssessment);

        setAssessment(parsedAssessment);

        if (
          parsedAssessment.consultationReason
        ) {
          setReason(
            parsedAssessment.consultationReason
          );
        } else if (
          parsedAssessment.pepUrgent === true
        ) {
          setReason("PEP assessment");
        }
      }
    } catch (error) {
      console.error(
        "Unable to load HIVClinTest patient journey:",
        error
      );
    } finally {
      setLoaded(true);
    }
  }, []);

  // --------------------------------------------------
  // UPDATE PATIENT
  // --------------------------------------------------

  function updatePatient(
    field: keyof Registration,
    value: string
  ) {
    setPatient((current) => {
      const updated = {
        ...current,
        [field]: value,
      };

      try {
        const previous =
          window.sessionStorage.getItem(
            "hivclintest_registration"
          );

        const previousData = previous
          ? JSON.parse(previous)
          : {};

        window.sessionStorage.setItem(
          "hivclintest_registration",
          JSON.stringify({
            ...previousData,
            ...updated,
          })
        );
      } catch (error) {
        console.error(
          "Unable to update registration:",
          error
        );
      }

      return updated;
    });
  }

  // --------------------------------------------------
  // ASSESSMENT COUNTS
  // --------------------------------------------------

  const symptomCount = useMemo(() => {
    if (!assessment?.symptoms) return 0;

    return Object.entries(
      assessment.symptoms
    ).filter(
      ([key, value]) =>
        key !== "none" && value === true
    ).length;
  }, [assessment]);

  const riskCount = useMemo(() => {
    if (!assessment?.risk) return 0;

    return Object.entries(
      assessment.risk
    ).filter(
      ([key, value]) =>
        key !== "none" && value === true
    ).length;
  }, [assessment]);

  // --------------------------------------------------
  // VALIDATION
  // --------------------------------------------------

  const canContinue = Boolean(
    patient.first_name.trim() &&
      patient.surname.trim() &&
      patient.email.trim() &&
      patient.mobile_number.trim() &&
      patient.identity_number.trim() &&
      patient.date_of_birth &&
      patient.gender &&
      reason &&
      consent
  );

  // --------------------------------------------------
  // STRIPE CHECKOUT
  // --------------------------------------------------

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canContinue || paymentLoading) {
      return;
    }

    setPaymentLoading(true);
    setPaymentError("");

    const referralDraft = {
      patient,

      consultation_reason: reason,

      consultation_fee: 250,

      assessment,

      source: "HIVClinTest",

      payment_status: "pending",

      referral_status:
        "awaiting_payment",

      created_at:
        new Date().toISOString(),
    };

    try {
      // Save the complete referral before
      // sending the patient to Stripe.

      window.sessionStorage.setItem(
        "hivclintest_virtual_gp_referral",
        JSON.stringify(referralDraft)
      );

      console.log(
        "Starting Stripe Checkout:",
        referralDraft
      );

      const response = await fetch(
        "/api/stripe/create-checkout-session",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            patient,

            consultation_reason:
              reason,

            consultation_fee: 250,

            assessment,

            source: "HIVClinTest",
          }),
        }
      );

      const data = await response.json();

      console.log(
        "Stripe Checkout response:",
        data
      );

      if (!response.ok) {
        throw new Error(
          data?.error ||
            "Unable to start Stripe payment."
        );
      }

      if (!data?.url) {
        throw new Error(
          "Stripe Checkout URL was not returned."
        );
      }

      // Save Stripe session ID locally
      // if the API returned one.

      if (data.session_id) {
        window.sessionStorage.setItem(
          "hivclintest_stripe_session_id",
          data.session_id
        );
      }

      // Redirect to Stripe hosted checkout.

      window.location.href = data.url;
    } catch (error) {
      console.error(
        "Stripe Checkout error:",
        error
      );

      setPaymentError(
        error instanceof Error
          ? error.message
          : "Unable to start payment. Please try again."
      );

      setPaymentLoading(false);
    }
  }

  // --------------------------------------------------
  // LOADING
  // --------------------------------------------------

  if (!loaded) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "grid",
          placeItems: "center",
          fontFamily:
            "Arial, sans-serif",
        }}
      >
        Loading patient details...
      </main>
    );
  }

  // --------------------------------------------------
  // PAGE
  // --------------------------------------------------

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#ffffff",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        color: "#172b35",
      }}
    >
      <div
        style={{
          maxWidth: "1000px",
          margin: "0 auto",
          padding: "32px 22px 80px",
        }}
      >
        <Link
          href="/assessment"
          style={{
            color: "#176b67",
            textDecoration: "none",
            fontWeight: 700,
          }}
        >
          ← Back
        </Link>

        <div
          style={{
            marginTop: "32px",
            marginBottom: "35px",
          }}
        >
          <p
            style={{
              margin: 0,
              color: "#16837c",
              fontWeight: 800,
              textTransform:
                "uppercase",
              letterSpacing: "1.5px",
              fontSize: "13px",
            }}
          >
            Virtual GP
          </p>

          <h1
            style={{
              margin: "8px 0 10px",
              fontSize: "42px",
              lineHeight: 1.1,
            }}
          >
            Virtual GP Consultation
          </h1>

          <p
            style={{
              fontSize: "18px",
              color: "#66767c",
              margin: 0,
            }}
          >
            Review your details and
            request a private consultation
            with a GP.
          </p>
        </div>

        {/* PEP ALERT */}

        {assessment?.pepUrgent && (
          <div
            style={{
              border:
                "2px solid #ef9c8d",
              background: "#fff7f5",
              borderRadius: "18px",
              padding: "22px",
              marginBottom: "28px",
            }}
          >
            <strong
              style={{
                display: "block",
                color: "#a13b2c",
                marginBottom: "8px",
              }}
            >
              URGENT — Possible PEP
              assessment
            </strong>

            <p
              style={{
                margin: 0,
                lineHeight: 1.6,
              }}
            >
              Your assessment indicates a
              possible recent HIV exposure.
              Clinical assessment should
              not be delayed.
            </p>
          </div>
        )}

        <form onSubmit={handleSubmit}>

          {/* PATIENT DETAILS */}

          <section
            style={{
              border:
                "1px solid #dce6e5",
              borderRadius: "20px",
              padding: "28px",
              marginBottom: "25px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
                marginBottom: "6px",
              }}
            >
              Your details
            </h2>

            <p
              style={{
                color: "#718087",
                marginTop: 0,
                marginBottom: "25px",
              }}
            >
              These details were entered
              when you registered. Please
              review them before
              continuing.
            </p>

            <div
              style={{
                display: "grid",
                gridTemplateColumns:
                  "repeat(auto-fit, minmax(230px, 1fr))",
                gap: "20px",
              }}
            >
              <Field
                label="First name"
                value={patient.first_name}
                required
                onChange={(value) =>
                  updatePatient(
                    "first_name",
                    value
                  )
                }
              />

              <Field
                label="Surname"
                value={patient.surname}
                required
                onChange={(value) =>
                  updatePatient(
                    "surname",
                    value
                  )
                }
              />

              <Field
                label="Email"
                value={patient.email}
                type="email"
                required
                onChange={(value) =>
                  updatePatient(
                    "email",
                    value
                  )
                }
              />

              <Field
                label="Mobile number"
                value={
                  patient.mobile_number
                }
                type="tel"
                required
                onChange={(value) =>
                  updatePatient(
                    "mobile_number",
                    value
                  )
                }
              />

              <Field
                label="ID / Passport number"
                value={
                  patient.identity_number
                }
                required
                onChange={(value) =>
                  updatePatient(
                    "identity_number",
                    value
                  )
                }
              />

              <Field
                label="Date of birth"
                value={
                  patient.date_of_birth
                }
                type="date"
                required
                onChange={(value) =>
                  updatePatient(
                    "date_of_birth",
                    value
                  )
                }
              />

              <label
                style={{
                  display: "flex",
                  flexDirection: "column",
                  gap: "8px",
                  fontWeight: 700,
                }}
              >
                Gender *

                <select
                  required
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

                  <option value="Male">
                    Male
                  </option>

                  <option value="Female">
                    Female
                  </option>

                  <option value="Other">
                    Other
                  </option>

                  <option value="Prefer not to say">
                    Prefer not to say
                  </option>
                </select>
              </label>

              <Field
                label="Country"
                value={patient.country}
                onChange={(value) =>
                  updatePatient(
                    "country",
                    value
                  )
                }
              />
            </div>
          </section>

          {/* ASSESSMENT */}

          {assessment && (
            <section
              style={{
                border:
                  "1px solid #dce6e5",
                borderRadius: "20px",
                padding: "25px",
                marginBottom: "25px",
                background: "#f9fcfb",
              }}
            >
              <h2
                style={{
                  marginTop: 0,
                }}
              >
                Assessment summary
              </h2>

              <div
                style={{
                  display: "grid",
                  gridTemplateColumns:
                    "repeat(auto-fit, minmax(180px, 1fr))",
                  gap: "15px",
                }}
              >
                <SummaryItem
                  label="Exposure"
                  value={
                    assessment.exposureTiming ||
                    "Not recorded"
                  }
                />

                <SummaryItem
                  label="PEP urgency"
                  value={
                    assessment.pepUrgent
                      ? "Urgent"
                      : "No urgent PEP flag"
                  }
                />

                <SummaryItem
                  label="Risk factors"
                  value={String(
                    riskCount
                  )}
                />

                <SummaryItem
                  label="Symptoms"
                  value={String(
                    symptomCount
                  )}
                />
              </div>
            </section>
          )}

          {/* CONSULTATION REASON */}

          <section
            style={{
              border:
                "1px solid #dce6e5",
              borderRadius: "20px",
              padding: "28px",
              marginBottom: "25px",
            }}
          >
            <h2
              style={{
                marginTop: 0,
              }}
            >
              What would you like help
              with?
            </h2>

            <p
              style={{
                color: "#718087",
              }}
            >
              Select the main reason for
              your consultation.
            </p>

            <div
              style={{
                display: "grid",
                gap: "12px",
                marginTop: "20px",
              }}
            >
              {consultationReasons.map(
                (item) => (
                  <label
                    key={item.value}
                    style={{
                      border:
                        reason ===
                        item.value
                          ? "2px solid #17a398"
                          : "1px solid #dce6e5",

                      borderRadius:
                        "15px",

                      padding: "18px",

                      display: "flex",

                      gap: "14px",

                      cursor: "pointer",

                      background:
                        reason ===
                        item.value
                          ? "#f2fffc"
                          : "#ffffff",
                    }}
                  >
                    <input
                      type="radio"
                      name="consultation_reason"
                      value={item.value}
                      checked={
                        reason ===
                        item.value
                      }
                      onChange={() =>
                        setReason(
                          item.value
                        )
                      }
                    />

                    <span>
                      <strong
                        style={{
                          display:
                            "block",
                          marginBottom:
                            "5px",
                        }}
                      >
                        {item.title}
                      </strong>

                      <span
                        style={{
                          color:
                            "#718087",
                        }}
                      >
                        {
                          item.description
                        }
                      </span>
                    </span>
                  </label>
                )
              )}
            </div>
          </section>

          {/* CONSENT */}

          <section
            style={{
              border:
                "1px solid #dce6e5",
              borderRadius: "20px",
              padding: "25px",
              marginBottom: "25px",
            }}
          >
            <label
              style={{
                display: "flex",
                alignItems:
                  "flex-start",
                gap: "12px",
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={consent}
                onChange={(event) =>
                  setConsent(
                    event.target.checked
                  )
                }
                style={{
                  marginTop: "4px",
                  width: "19px",
                  height: "19px",
                }}
              />

              <span
                style={{
                  lineHeight: 1.6,
                }}
              >
                I consent to my
                registration details and
                HIV assessment information
                being shared with the
                healthcare professional
                providing this
                consultation.
              </span>
            </label>
          </section>

          {/* PAYMENT */}

          <div
            style={{
              background: "#f7faf9",
              borderRadius: "20px",
              padding: "25px",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent:
                  "space-between",
                alignItems: "center",
                gap: "20px",
                flexWrap: "wrap",
                marginBottom: "18px",
              }}
            >
              <div>
                <strong
                  style={{
                    fontSize: "20px",
                  }}
                >
                  Virtual GP Consultation
                </strong>

                <div
                  style={{
                    color: "#718087",
                    marginTop: "5px",
                  }}
                >
                  Secure online
                  consultation
                </div>
              </div>

              <strong
                style={{
                  fontSize: "28px",
                }}
              >
                R250
              </strong>
            </div>

            <button
              type="submit"
              disabled={
                !canContinue ||
                paymentLoading
              }
              style={{
                width: "100%",
                border: 0,
                borderRadius: "15px",
                padding: "19px 22px",
                fontSize: "18px",
                fontWeight: 900,

                background:
                  canContinue &&
                  !paymentLoading
                    ? "#39ff14"
                    : "#d9e2df",

                color:
                  canContinue &&
                  !paymentLoading
                    ? "#12352d"
                    : "#899591",

                cursor:
                  canContinue &&
                  !paymentLoading
                    ? "pointer"
                    : "not-allowed",

                boxShadow:
                  canContinue &&
                  !paymentLoading
                    ? "0 0 22px rgba(57,255,20,.35)"
                    : "none",
              }}
            >
              {paymentLoading
                ? "Connecting to secure payment..."
                : "Pay R250 & Request Virtual GP"}
            </button>

            {paymentError && (
              <div
                style={{
                  marginTop: "15px",
                  padding: "14px 16px",
                  borderRadius: "12px",
                  background: "#fff1f0",
                  border:
                    "1px solid #f2b8b5",
                  color: "#a13b2c",
                  fontWeight: 700,
                  lineHeight: 1.5,
                }}
              >
                {paymentError}
              </div>
            )}

            <p
              style={{
                textAlign: "center",
                color: "#718087",
                fontSize: "13px",
                marginBottom: 0,
              }}
            >
              You will be redirected to
              Stripe for secure payment.
              Your consultation request
              will only be submitted after
              payment has been
              successfully verified.
            </p>
          </div>
        </form>
      </div>
    </main>
  );
}

// --------------------------------------------------
// SHARED STYLES
// --------------------------------------------------

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: "14px 15px",
  borderRadius: "11px",
  border:
    "1px solid #cad7d5",
  background: "#ffffff",
  fontSize: "16px",
  color: "#172b35",
};

// --------------------------------------------------
// FIELD
// --------------------------------------------------

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
}: {
  label: string;
  value: string;
  onChange: (
    value: string
  ) => void;
  type?: string;
  required?: boolean;
}) {
  return (
    <label
      style={{
        display: "flex",
        flexDirection: "column",
        gap: "8px",
        fontWeight: 700,
      }}
    >
      {label}
      {required ? " *" : ""}

      <input
        type={type}
        required={required}
        value={value}
        onChange={(event) =>
          onChange(
            event.target.value
          )
        }
        style={inputStyle}
      />
    </label>
  );
}

// --------------------------------------------------
// SUMMARY ITEM
// --------------------------------------------------

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
        border:
          "1px solid #e0e9e7",
        borderRadius: "12px",
        padding: "15px",
      }}
    >
      <div
        style={{
          color: "#718087",
          fontSize: "12px",
          textTransform:
            "uppercase",
          fontWeight: 800,
          marginBottom: "6px",
        }}
      >
        {label}
      </div>

      <strong>{value}</strong>
    </div>
  );
}
