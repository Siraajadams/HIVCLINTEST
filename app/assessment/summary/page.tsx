"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

type Pharmacy = {
  practice_no: string | number | null;
  practice_name: string | null;
  practice_contact_no: string | null;
  practice_province: string | null;
  practice_full_address: string | null;
};

type RiskState = {
  condomlessSex: boolean;
  multiplePartners: boolean;
  partnerPositive: boolean;
  partnerUnknown: boolean;
  recentSTI: boolean;
  none: boolean;
};

type SymptomState = {
  genitalSore: boolean;
  discharge: boolean;
  painfulUrination: boolean;
  genitalRash: boolean;
  none: boolean;
};

type Assessment = {
  exposureTiming: string;
  risk: RiskState;
  symptoms: SymptomState;
  prepInterest: string;
  searchLocation?: {
    city?: string;
    suburb?: string;
  };
  selectedPharmacy: Pharmacy;
  completedAt?: string;
};

export default function AssessmentSummaryPage() {
  const router = useRouter();

  const [assessment, setAssessment] =
    useState<Assessment | null>(null);

  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const saved = sessionStorage.getItem(
        "hivclintest_assessment"
      );

      if (saved) {
        setAssessment(JSON.parse(saved));
      }
    } catch (error) {
      console.error(
        "Unable to load assessment:",
        error
      );
    } finally {
      setLoading(false);
    }
  }, []);

  if (loading) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <p>Loading your assessment...</p>
        </div>
      </main>
    );
  }

  if (!assessment) {
    return (
      <main style={styles.page}>
        <div style={styles.container}>
          <p style={styles.eyebrow}>
            HIVClinTest
          </p>

          <h1 style={styles.heading}>
            Assessment not found
          </h1>

          <p style={styles.text}>
            We could not find your completed assessment.
            Please restart the assessment.
          </p>

          <button
            type="button"
            style={styles.primaryButton}
            onClick={() =>
              router.push("/assessment")
            }
          >
            Start assessment
          </button>
        </div>
      </main>
    );
  }

  const pharmacy = assessment.selectedPharmacy;

  const pepUrgent = [
    "within24",
    "24to48",
    "48to72",
  ].includes(assessment.exposureTiming);

  const hasSymptoms =
    assessment.symptoms &&
    !assessment.symptoms.none &&
    Object.entries(assessment.symptoms).some(
      ([key, value]) =>
        key !== "none" && value
    );

  const mapQuery =
    pharmacy?.practice_full_address ||
    pharmacy?.practice_name ||
    "";

  const mapUrl =
    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
      mapQuery
    )}`;

  function exposureLabel(value: string) {
    switch (value) {
      case "within24":
        return "Within the last 24 hours";

      case "24to48":
        return "24–48 hours ago";

      case "48to72":
        return "48–72 hours ago";

      case "3to7":
        return "3–7 days ago";

      case "8to30":
        return "8–30 days ago";

      case "over30":
        return "More than 30 days ago";

      case "unsure":
        return "Not sure";

      default:
        return "Not recorded";
    }
  }

  function prepLabel(value: string) {
    switch (value) {
      case "prep":
        return "Interested in PrEP";

      case "clinician":
        return "Would like to speak to a healthcare professional";

      case "services":
        return "Looking for HIV prevention services";

      default:
        return "Not recorded";
    }
  }

  function startAgain() {
    sessionStorage.removeItem(
      "hivclintest_assessment"
    );

    sessionStorage.removeItem(
      "hivclintest_selected_pharmacy"
    );

    router.push("/assessment");
  }

  return (
    <main style={styles.page}>
      <div style={styles.container}>

        <p style={styles.eyebrow}>
          HIVClinTest
        </p>

        <h1 style={styles.heading}>
          Your HIV prevention pathway
        </h1>

        <p style={styles.intro}>
          Based on the information you provided,
          here are your next steps.
        </p>

        {/* PEP URGENT */}

        {pepUrgent && (
          <section style={styles.urgentCard}>

            <div style={styles.urgentBadge}>
              URGENT
            </div>

            <h2 style={styles.cardHeading}>
              You may need PEP
            </h2>

            <p style={styles.text}>
              You reported a possible HIV exposure
              within the last 72 hours.
            </p>

            <p style={styles.text}>
              PEP is medication used after a possible
              HIV exposure. It should be assessed as
              soon as possible and started within
              72 hours when clinically appropriate.
            </p>

            <p style={styles.urgentText}>
              Please seek urgent assessment from a
              healthcare professional or healthcare
              facility.
            </p>

          </section>
        )}

        {/* STI SYMPTOMS */}

        {hasSymptoms && (
          <section style={styles.warningCard}>

            <p style={styles.eyebrow}>
              STI assessment
            </p>

            <h2 style={styles.cardHeading}>
              You reported symptoms
            </h2>

            <p style={styles.text}>
              You indicated that you currently have
              one or more symptoms that may require
              assessment by a healthcare professional.
            </p>

            <p style={styles.text}>
              Please discuss these symptoms with the
              pharmacist or another healthcare
              professional.
            </p>

          </section>
        )}

        {/* SELECTED PHARMACY */}

        <section style={styles.pharmacyCard}>

          <p style={styles.successEyebrow}>
            ✓ Selected pharmacy
          </p>

          <h2 style={styles.cardHeading}>
            {pharmacy?.practice_name ||
              "Selected pharmacy"}
          </h2>

          {pharmacy?.practice_full_address && (
            <p style={styles.text}>
              <strong>Address:</strong>
              <br />
              {pharmacy.practice_full_address}
            </p>
          )}

          {pharmacy?.practice_province && (
            <p style={styles.text}>
              <strong>Province:</strong>{" "}
              {pharmacy.practice_province}
            </p>
          )}

          {pharmacy?.practice_contact_no && (
            <p style={styles.text}>
              <strong>Telephone:</strong>{" "}

              <a
                href={`tel:${pharmacy.practice_contact_no}`}
                style={styles.link}
              >
                {pharmacy.practice_contact_no}
              </a>
            </p>
          )}

          <div style={styles.buttonRow}>

            {mapQuery && (
              <a
                href={mapUrl}
                target="_blank"
                rel="noopener noreferrer"
                style={styles.primaryLink}
              >
                View pharmacy on map
              </a>
            )}

            {pharmacy?.practice_contact_no && (
              <a
                href={`tel:${pharmacy.practice_contact_no}`}
                style={styles.secondaryLink}
              >
                Call pharmacy
              </a>
            )}

          </div>

        </section>

        {/* NEXT STEP */}

        <section style={styles.nextStepCard}>

          <p style={styles.eyebrow}>
            Your next step
          </p>

          <h2 style={styles.cardHeading}>
            Contact your selected pharmacy
          </h2>

          {assessment.prepInterest === "prep" ? (
            <>
              <p style={styles.text}>
                You indicated that you are interested
                in PrEP.
              </p>

              <p style={styles.highlightText}>
                Contact or visit your selected
                HIVClinExp pharmacy for a PrEP
                assessment.
              </p>
            </>
          ) : (
            <p style={styles.text}>
              Contact or visit your selected HIVClinExp
              pharmacy for further HIV prevention
              support and assessment.
            </p>
          )}

          {pepUrgent && (
            <p style={styles.urgentText}>
              Because your possible exposure was
              within the last 72 hours, do not delay
              seeking professional assessment for PEP.
            </p>
          )}

        </section>

        {/* SUMMARY */}

        <section style={styles.summaryCard}>

          <p style={styles.eyebrow}>
            Assessment summary
          </p>

          <div style={styles.summaryRow}>

            <span style={styles.summaryLabel}>
              Possible exposure
            </span>

            <span style={styles.summaryValue}>
              {exposureLabel(
                assessment.exposureTiming
              )}
            </span>

          </div>

          <div style={styles.summaryRow}>

            <span style={styles.summaryLabel}>
              PrEP pathway
            </span>

            <span style={styles.summaryValue}>
              {prepLabel(
                assessment.prepInterest
              )}
            </span>

          </div>

          <div style={styles.summaryRow}>

            <span style={styles.summaryLabel}>
              STI symptoms
            </span>

            <span style={styles.summaryValue}>
              {hasSymptoms
                ? "Symptoms reported"
                : "No listed symptoms reported"}
            </span>

          </div>

        </section>

        {/* DISCLAIMER */}

        <section style={styles.disclaimer}>

          <strong>
            Important
          </strong>

          <p style={{ marginBottom: 0 }}>
            HIVClinTest provides educational and
            navigation support and does not replace
            assessment, diagnosis or treatment by a
            qualified healthcare professional.
          </p>

        </section>

        <button
          type="button"
          style={styles.restartButton}
          onClick={startAgain}
        >
          Start a new assessment
        </button>

      </div>
    </main>
  );
}

const styles: Record<
  string,
  React.CSSProperties
> = {

  page: {
    minHeight: "100vh",
    background: "#f7faf9",
    padding: "40px 20px",
    fontFamily:
      "Arial, Helvetica, sans-serif",
    color: "#16332d",
  },

  container: {
    width: "100%",
    maxWidth: "760px",
    margin: "0 auto",
  },

  eyebrow: {
    color: "#167565",
    fontWeight: 800,
    fontSize: "14px",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
    marginBottom: "10px",
  },

  successEyebrow: {
    color: "#167565",
    fontWeight: 800,
    fontSize: "14px",
    marginBottom: "10px",
  },

  heading: {
    fontSize: "36px",
    lineHeight: 1.15,
    marginTop: 0,
    marginBottom: "14px",
  },

  intro: {
    fontSize: "18px",
    lineHeight: 1.6,
    color: "#4b625d",
    marginBottom: "28px",
  },

  cardHeading: {
    fontSize: "24px",
    marginTop: 0,
    marginBottom: "12px",
  },

  text: {
    fontSize: "16px",
    lineHeight: 1.6,
  },

  urgentCard: {
    padding: "24px",
    borderRadius: "18px",
    border: "2px solid #d54b3d",
    background: "#fff4f2",
    marginBottom: "20px",
  },

  warningCard: {
    padding: "24px",
    borderRadius: "18px",
    border: "1px solid #e3c878",
    background: "#fffaf0",
    marginBottom: "20px",
  },

  pharmacyCard: {
    padding: "24px",
    borderRadius: "18px",
    border: "2px solid #167565",
    background: "#f1f8f6",
    marginBottom: "20px",
  },

  nextStepCard: {
    padding: "24px",
    borderRadius: "18px",
    border: "1px solid #d8e5e1",
    background: "#ffffff",
    marginBottom: "20px",
  },

  summaryCard: {
    padding: "24px",
    borderRadius: "18px",
    border: "1px solid #d8e5e1",
    background: "#ffffff",
    marginBottom: "20px",
  },

  urgentBadge: {
    display: "inline-block",
    background: "#d54b3d",
    color: "#ffffff",
    padding: "6px 10px",
    borderRadius: "999px",
    fontWeight: 800,
    fontSize: "12px",
    marginBottom: "14px",
  },

  urgentText: {
    fontSize: "16px",
    lineHeight: 1.6,
    fontWeight: 700,
    color: "#9f3027",
  },

  highlightText: {
    fontSize: "16px",
    lineHeight: 1.6,
    fontWeight: 700,
    color: "#167565",
  },

  buttonRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "12px",
    marginTop: "20px",
  },

  primaryLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 20px",
    borderRadius: "999px",
    background: "#167565",
    color: "#ffffff",
    textDecoration: "none",
    fontWeight: 700,
  },

  secondaryLink: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "13px 20px",
    borderRadius: "999px",
    background: "#ffffff",
    color: "#167565",
    textDecoration: "none",
    fontWeight: 700,
    border: "1px solid #167565",
  },

  link: {
    color: "#167565",
    fontWeight: 700,
  },

  summaryRow: {
    display: "flex",
    justifyContent: "space-between",
    gap: "20px",
    padding: "14px 0",
    borderBottom:
      "1px solid #e6ecea",
  },

  summaryLabel: {
    fontWeight: 700,
  },

  summaryValue: {
    textAlign: "right",
    color: "#4b625d",
  },

  disclaimer: {
    padding: "20px",
    borderRadius: "14px",
    background: "#eef3f2",
    fontSize: "14px",
    lineHeight: 1.6,
    marginBottom: "24px",
  },

  primaryButton: {
    border: 0,
    borderRadius: "999px",
    padding: "14px 22px",
    background: "#167565",
    color: "#ffffff",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
  },

  restartButton: {
    width: "100%",
    border: "1px solid #167565",
    borderRadius: "999px",
    padding: "14px 22px",
    background: "#ffffff",
    color: "#167565",
    fontWeight: 700,
    fontSize: "16px",
    cursor: "pointer",
  },
};
