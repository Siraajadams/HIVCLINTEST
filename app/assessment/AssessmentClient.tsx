"use client";

import { useState } from "react";

type Step =
  | "exposure"
  | "risk"
  | "symptoms"
  | "prep"
  | "care"
  | "location";

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

type Pharmacy = {
  practice_no: string | number | null;
  practice_name: string | null;
  practice_contact_no: string | null;
  practice_province: string | null;
  practice_full_address: string | null;
};

export default function AssessmentClient() {
  const [step, setStep] = useState<Step>("exposure");

  const [exposureTiming, setExposureTiming] = useState("");

  const [risk, setRisk] = useState<RiskState>({
    condomlessSex: false,
    multiplePartners: false,
    partnerPositive: false,
    partnerUnknown: false,
    recentSTI: false,
    none: false,
  });

  const [symptoms, setSymptoms] = useState<SymptomState>({
    genitalSore: false,
    discharge: false,
    painfulUrination: false,
    genitalRash: false,
    none: false,
  });

  const [prepInterest, setPrepInterest] = useState("");

  const [city, setCity] = useState("");
  const [suburb, setSuburb] = useState("");

  const [searchMessage, setSearchMessage] = useState("");
  const [searchError, setSearchError] = useState("");
  const [searching, setSearching] = useState(false);

  const [pharmacies, setPharmacies] = useState<Pharmacy[]>([]);
  const [selectedPharmacy, setSelectedPharmacy] =
    useState<Pharmacy | null>(null);

  // =========================================================
  // PEP URGENCY
  // =========================================================

  const pepUrgent = ["within24", "24to48", "48to72"].includes(
    exposureTiming
  );

  // =========================================================
  // RISK
  // =========================================================

  function toggleRisk(key: keyof RiskState) {
    setRisk((prev) => {
      if (key === "none") {
        const selectingNone = !prev.none;

        return {
          condomlessSex: false,
          multiplePartners: false,
          partnerPositive: false,
          partnerUnknown: false,
          recentSTI: false,
          none: selectingNone,
        };
      }

      return {
        ...prev,
        [key]: !prev[key],
        none: false,
      };
    });
  }

  // =========================================================
  // SYMPTOMS
  // =========================================================

  function toggleSymptom(key: keyof SymptomState) {
    setSymptoms((prev) => {
      if (key === "none") {
        const selectingNone = !prev.none;

        return {
          genitalSore: false,
          discharge: false,
          painfulUrination: false,
          genitalRash: false,
          none: selectingNone,
        };
      }

      return {
        ...prev,
        [key]: !prev[key],
        none: false,
      };
    });
  }

  const selectedRiskCount = Object.entries(risk).filter(
    ([key, value]) => key !== "none" && value
  ).length;

  const selectedSymptomCount = Object.entries(symptoms).filter(
    ([key, value]) => key !== "none" && value
  ).length;

  const riskAnswered = selectedRiskCount > 0 || risk.none;

  const symptomsAnswered =
    selectedSymptomCount > 0 || symptoms.none;

  // =========================================================
  // SAVE BASE ASSESSMENT
  // =========================================================

  function buildAssessment(
    carePreference: "pharmacy" | "virtual_gp"
  ) {
    return {
      exposureTiming,
      risk,
      symptoms,
      prepInterest,

      carePreference,

      consultationReason: pepUrgent
        ? "Urgent HIV PEP Assessment"
        : "PrEP Consultation",

      consultationFee:
        carePreference === "virtual_gp" ? 250 : null,

      pepUrgent,

      completedAt: new Date().toISOString(),
    };
  }

  // =========================================================
  // VIRTUAL GP
  // =========================================================

  function continueWithVirtualGP() {
    try {
      const assessment = buildAssessment("virtual_gp");

      sessionStorage.removeItem(
        "hivclintest_selected_pharmacy"
      );

      sessionStorage.setItem(
        "hivclintest_assessment",
        JSON.stringify(assessment)
      );

      window.location.href = "/assessment/virtual-gp";
    } catch (error) {
      console.error(
        "Unable to start Virtual GP pathway:",
        error
      );

      setSearchError(
        "Unable to continue to the Virtual GP consultation. Please try again."
      );
    }
  }

  // =========================================================
  // PHARMACY PATHWAY
  // =========================================================

  function continueWithPharmacy() {
    try {
      const assessment = buildAssessment("pharmacy");

      sessionStorage.setItem(
        "hivclintest_assessment",
        JSON.stringify(assessment)
      );

      setStep("location");
    } catch (error) {
      console.error(
        "Unable to start pharmacy pathway:",
        error
      );
    }
  }

  // =========================================================
  // PHARMACY SEARCH
  // =========================================================

  async function searchPharmacies() {
    const cleanCity = city.trim();
    const cleanSuburb = suburb.trim();

    if (!cleanCity && !cleanSuburb) {
      setSearchError(
        "Please enter a city, town or suburb."
      );
      return;
    }

    setSearching(true);
    setSearchError("");
    setSearchMessage("");
    setPharmacies([]);
    setSelectedPharmacy(null);

    try {
      const params = new URLSearchParams();

      if (cleanCity) {
        params.set("city", cleanCity);
      }

      if (cleanSuburb) {
        params.set("suburb", cleanSuburb);
      }

      params.set("purpose", "prep");

      const response = await fetch(
        `/api/pharmacies/search?${params.toString()}`,
        {
          method: "GET",
          cache: "no-store",
        }
      );

      const rawText = await response.text();

      let result: {
        success?: boolean;
        count?: number;
        pharmacies?: Pharmacy[];
        error?: string;
      };

      try {
        result = JSON.parse(rawText);
      } catch {
        throw new Error(
          "The pharmacy search service returned an invalid response."
        );
      }

      if (!response.ok) {
        console.error("Pharmacy API error:", result);

        throw new Error(
          result.error || "Unable to search pharmacies."
        );
      }

      const results = result.pharmacies || [];

      setPharmacies(results);

      if (results.length === 0) {
        setSearchMessage(
          "No participating pharmacies were found for this location. Try another nearby suburb or city."
        );
      } else {
        setSearchMessage(
          `${results.length} participating ${
            results.length === 1
              ? "pharmacy"
              : "pharmacies"
          } found.`
        );
      }
    } catch (error) {
      console.error("Pharmacy search failed:", error);

      setSearchError(
        error instanceof Error
          ? error.message
          : "Unable to search pharmacies."
      );
    } finally {
      setSearching(false);
    }
  }

  // =========================================================
  // SELECT PHARMACY
  // =========================================================

  function selectPharmacy(pharmacy: Pharmacy) {
    setSelectedPharmacy(pharmacy);

    setSearchMessage(
      `${pharmacy.practice_name || "Pharmacy"} selected.`
    );

    window.setTimeout(() => {
      document
        .getElementById("pharmacy-confirmation")
        ?.scrollIntoView({
          behavior: "smooth",
          block: "center",
        });
    }, 100);
  }

  // =========================================================
  // COMPLETE PHARMACY PATHWAY
  // =========================================================

  function continueWithSelectedPharmacy() {
    if (!selectedPharmacy) return;

    const assessment = {
      ...buildAssessment("pharmacy"),

      searchLocation: {
        city,
        suburb,
      },

      selectedPharmacy,
    };

    try {
      sessionStorage.setItem(
        "hivclintest_selected_pharmacy",
        JSON.stringify(selectedPharmacy)
      );

      sessionStorage.setItem(
        "hivclintest_assessment",
        JSON.stringify(assessment)
      );

      window.location.href = "/assessment/summary";
    } catch (error) {
      console.error("Unable to save assessment:", error);

      setSearchError(
        "We could not continue with your selected pharmacy. Please try again."
      );
    }
  }

  // =========================================================
  // CHOICE BUTTON
  // =========================================================

  function ChoiceButton({
    selected,
    onClick,
    children,
  }: {
    selected: boolean;
    onClick: () => void;
    children: React.ReactNode;
  }) {
    return (
      <button
        type="button"
        className={
          selected
            ? "choice-button selected"
            : "choice-button"
        }
        onClick={onClick}
        aria-pressed={selected}
        style={
          selected
            ? {
                background: "#167565",
                color: "#ffffff",
                borderColor: "#167565",
                fontWeight: 700,
              }
            : undefined
        }
      >
        <span
          style={{
            display: "flex",
            alignItems: "center",
            gap: "10px",
            width: "100%",
          }}
        >
          {selected && (
            <span
              style={{
                width: "22px",
                height: "22px",
                minWidth: "22px",
                borderRadius: "50%",
                background: "#ffffff",
                color: "#167565",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                fontSize: "14px",
                fontWeight: 900,
              }}
            >
              ✓
            </span>
          )}

          {children}
        </span>
      </button>
    );
  }

  // =========================================================
  // RENDER
  // =========================================================

  return (
    <>
      {/* =====================================================
          STEP 1 — EXPOSURE
      ====================================================== */}

      {step === "exposure" && (
        <>
          <p className="eyebrow">HIV assessment</p>

          <h1>When was the possible HIV exposure?</h1>

          <p className="flow-subtitle">
            This helps identify whether you may need urgent
            assessment for PEP.
          </p>

          <div className="question-card">
            <div className="choice-column">
              {[
                ["within24", "Within the last 24 hours"],
                ["24to48", "24–48 hours ago"],
                ["48to72", "48–72 hours ago"],
                ["3to7", "3–7 days ago"],
                ["8to30", "8–30 days ago"],
                ["over30", "More than 30 days ago"],
                ["unsure", "I'm not sure"],
              ].map(([value, label]) => (
                <ChoiceButton
                  key={value}
                  selected={exposureTiming === value}
                  onClick={() => setExposureTiming(value)}
                >
                  {label}
                </ChoiceButton>
              ))}
            </div>
          </div>

          {pepUrgent && (
            <div
              className="question-card"
              style={{
                border: "2px solid #c65f4b",
                background: "#fff6f3",
              }}
            >
              <p
                className="eyebrow"
                style={{
                  color: "#a64232",
                  marginTop: 0,
                }}
              >
                URGENT
              </p>

              <h2>You may need PEP</h2>

              <p>
                PEP is medication used after a possible HIV
                exposure. It should be assessed as soon as
                possible and started within 72 hours when
                clinically appropriate.
              </p>

              <p>
                Please seek urgent assessment from a healthcare
                professional or healthcare facility.
              </p>
            </div>
          )}

          <button
            type="button"
            className="start-button"
            disabled={!exposureTiming}
            onClick={() => setStep("risk")}
          >
            Continue
          </button>
        </>
      )}

      {/* =====================================================
          STEP 2 — RISK
      ====================================================== */}

      {step === "risk" && (
        <>
          <p className="eyebrow">HIV prevention</p>

          <h1>
            A few questions about your sexual health
          </h1>

          <p className="flow-subtitle">
            Select all that have applied to you during the last
            6 months.
          </p>

          <div className="question-card">
            <div className="choice-column">
              <ChoiceButton
                selected={risk.condomlessSex}
                onClick={() => toggleRisk("condomlessSex")}
              >
                Sex without a condom
              </ChoiceButton>

              <ChoiceButton
                selected={risk.multiplePartners}
                onClick={() => toggleRisk("multiplePartners")}
              >
                More than one sexual partner
              </ChoiceButton>

              <ChoiceButton
                selected={risk.partnerPositive}
                onClick={() => toggleRisk("partnerPositive")}
              >
                A sexual partner living with HIV
              </ChoiceButton>

              <ChoiceButton
                selected={risk.partnerUnknown}
                onClick={() => toggleRisk("partnerUnknown")}
              >
                Unsure of a sexual partner&apos;s HIV status
              </ChoiceButton>

              <ChoiceButton
                selected={risk.recentSTI}
                onClick={() => toggleRisk("recentSTI")}
              >
                Recently diagnosed with an STI
              </ChoiceButton>

              <div
                style={{
                  borderTop: "1px solid #e5e5e5",
                  margin: "8px 0",
                }}
              />

              <ChoiceButton
                selected={risk.none}
                onClick={() => toggleRisk("none")}
              >
                None of the above
              </ChoiceButton>
            </div>

            {selectedRiskCount > 0 && (
              <p
                style={{
                  marginTop: "16px",
                  marginBottom: 0,
                  color: "#167565",
                  fontWeight: 700,
                }}
              >
                ✓ {selectedRiskCount} option
                {selectedRiskCount === 1 ? "" : "s"} selected
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="choice-button"
              onClick={() => setStep("exposure")}
            >
              ← Back
            </button>

            <button
              type="button"
              className="start-button"
              disabled={!riskAnswered}
              onClick={() => setStep("symptoms")}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* =====================================================
          STEP 3 — SYMPTOMS
      ====================================================== */}

      {step === "symptoms" && (
        <>
          <p className="eyebrow">STI screening</p>

          <h1>
            Do you currently have any of these symptoms?
          </h1>

          <p className="flow-subtitle">
            Select all that apply.
          </p>

          <div className="question-card">
            <div className="choice-column">
              <ChoiceButton
                selected={symptoms.genitalSore}
                onClick={() =>
                  toggleSymptom("genitalSore")
                }
              >
                Genital sore or ulcer
              </ChoiceButton>

              <ChoiceButton
                selected={symptoms.discharge}
                onClick={() =>
                  toggleSymptom("discharge")
                }
              >
                Unusual genital discharge
              </ChoiceButton>

              <ChoiceButton
                selected={symptoms.painfulUrination}
                onClick={() =>
                  toggleSymptom("painfulUrination")
                }
              >
                Pain or burning when urinating
              </ChoiceButton>

              <ChoiceButton
                selected={symptoms.genitalRash}
                onClick={() =>
                  toggleSymptom("genitalRash")
                }
              >
                Genital rash
              </ChoiceButton>

              <div
                style={{
                  borderTop: "1px solid #e5e5e5",
                  margin: "8px 0",
                }}
              />

              <ChoiceButton
                selected={symptoms.none}
                onClick={() => toggleSymptom("none")}
              >
                None of the above
              </ChoiceButton>
            </div>

            {selectedSymptomCount > 0 && (
              <p
                style={{
                  marginTop: "16px",
                  marginBottom: 0,
                  color: "#167565",
                  fontWeight: 700,
                }}
              >
                ✓ {selectedSymptomCount} symptom
                {selectedSymptomCount === 1 ? "" : "s"} selected
              </p>
            )}
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="choice-button"
              onClick={() => setStep("risk")}
            >
              ← Back
            </button>

            <button
              type="button"
              className="start-button"
              disabled={!symptomsAnswered}
              onClick={() => setStep("prep")}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* =====================================================
          STEP 4 — PREP
      ====================================================== */}

      {step === "prep" && (
        <>
          <p className="eyebrow">HIV prevention</p>

          <h1>Would you like to consider PrEP?</h1>

          <p className="flow-subtitle">
            PrEP is HIV prevention medication for people who do
            not have HIV. A healthcare professional can assess
            whether it is appropriate for you.
          </p>

          <div className="question-card">
            <div className="choice-column">
              <ChoiceButton
                selected={prepInterest === "prep"}
                onClick={() => setPrepInterest("prep")}
              >
                Yes — I&apos;m interested in PrEP
              </ChoiceButton>

              <ChoiceButton
                selected={prepInterest === "clinician"}
                onClick={() => setPrepInterest("clinician")}
              >
                Speak to a healthcare professional
              </ChoiceButton>

              <ChoiceButton
                selected={prepInterest === "services"}
                onClick={() => setPrepInterest("services")}
              >
                Find HIV prevention services near me
              </ChoiceButton>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "12px",
              flexWrap: "wrap",
            }}
          >
            <button
              type="button"
              className="choice-button"
              onClick={() => setStep("symptoms")}
            >
              ← Back
            </button>

            <button
              type="button"
              className="start-button"
              disabled={!prepInterest}
              onClick={() => setStep("care")}
            >
              Continue
            </button>
          </div>
        </>
      )}

      {/* =====================================================
          STEP 5 — CHOOSE CARE
      ====================================================== */}

      {step === "care" && (
        <>
          <p className="eyebrow">YOUR NEXT STEP</p>

          <h1>
            How would you like to access HIV prevention care?
          </h1>

          <p className="flow-subtitle">
            Choose an in-person PrEP pharmacy or speak privately
            with a GP online.
          </p>

          {pepUrgent && (
            <div
              className="question-card"
              style={{
                border: "2px solid #c65f4b",
                background: "#fff6f3",
                marginBottom: "24px",
              }}
            >
              <p
                className="eyebrow"
                style={{
                  color: "#a64232",
                  marginTop: 0,
                }}
              >
                URGENT
              </p>

              <h2>You may need PEP</h2>

              <p>
                You reported a possible HIV exposure within the
                last 72 hours.
              </p>

              <p style={{ marginBottom: 0 }}>
                Please seek assessment as soon as possible. PEP
                should be started within 72 hours when clinically
                appropriate.
              </p>
            </div>
          )}

          <div
            style={{
              display: "grid",
              gap: "18px",
            }}
          >
            {/* ===============================================
                PREP PHARMACY
            =============================================== */}

            <button
              type="button"
              onClick={continueWithPharmacy}
              style={{
                width: "100%",
                padding: "26px",
                borderRadius: "18px",
                border: "2px solid #167565",
                background: "#ffffff",
                color: "#163d36",
                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontSize: "28px",
                    lineHeight: 1,
                  }}
                >
                  🏥
                </div>

                <div>
                  <div
                    style={{
                      fontSize: "20px",
                      fontWeight: 800,
                      marginBottom: "8px",
                    }}
                  >
                    In-person consultation at a PrEP pharmacy
                  </div>

                  <div
                    style={{
                      fontSize: "16px",
                      lineHeight: 1.5,
                      fontWeight: 400,
                    }}
                  >
                    Find a participating HIVClinExp pharmacy for
                    an in-person HIV prevention assessment.
                  </div>

                  <div
                    style={{
                      marginTop: "14px",
                      fontWeight: 800,
                      color: "#167565",
                    }}
                  >
                    Find a PrEP pharmacy →
                  </div>
                </div>
              </div>
            </button>

            {/* ===============================================
                VIRTUAL GP — NEON GREEN
            =============================================== */}

            <button
              type="button"
              onClick={continueWithVirtualGP}
              style={{
                width: "100%",
                padding: "28px",
                borderRadius: "18px",

                background:
                  "linear-gradient(90deg, #39ff14 0%, #65ff36 50%, #39ff14 100%)",

                border: "2px solid #2ee80f",

                color: "#12351c",

                cursor: "pointer",
                textAlign: "left",
                fontFamily: "inherit",

                boxShadow:
                  "0 10px 30px rgba(57,255,20,0.28)",

                transition:
                  "transform 0.15s ease, box-shadow 0.15s ease",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                  "translateY(-2px)";

                e.currentTarget.style.boxShadow =
                  "0 14px 34px rgba(57,255,20,0.38)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                  "translateY(0)";

                e.currentTarget.style.boxShadow =
                  "0 10px 30px rgba(57,255,20,0.28)";
              }}
            >
              <div
                style={{
                  display: "flex",
                  gap: "16px",
                  alignItems: "flex-start",
                }}
              >
                <div
                  style={{
                    fontSize: "30px",
                    lineHeight: 1,
                  }}
                >
                  📱
                </div>

                <div style={{ flex: 1 }}>
                  <div
                    style={{
                      fontSize: "23px",
                      fontWeight: 900,
                      marginBottom: "8px",
                    }}
                  >
                    Virtual GP Consultation
                  </div>

                  <div
                    style={{
                      fontSize: "16px",
                      lineHeight: 1.5,
                      fontWeight: 500,
                    }}
                  >
                    {pepUrgent
                      ? "Speak privately with a GP online for urgent PEP or PrEP assessment."
                      : "Speak privately with a GP online about PrEP and HIV prevention."}
                  </div>

                  <div
                    style={{
                      marginTop: "15px",
                      fontSize: "20px",
                      fontWeight: 900,
                    }}
                  >
                    R250 consultation →
                  </div>
                </div>
              </div>
            </button>
          </div>

          {searchError && (
            <div
              style={{
                marginTop: "20px",
                padding: "18px",
                borderRadius: "14px",
                background: "#fff4f2",
                border: "1px solid #efcbc5",
              }}
            >
              <strong>Unable to continue</strong>

              <p
                style={{
                  marginTop: "6px",
                  marginBottom: 0,
                }}
              >
                {searchError}
              </p>
            </div>
          )}

          <div style={{ marginTop: "22px" }}>
            <button
              type="button"
              className="choice-button"
              onClick={() => setStep("prep")}
            >
              ← Back
            </button>
          </div>
        </>
      )}

      {/* =====================================================
          STEP 6 — LOCATION
      ====================================================== */}

      {step === "location" && (
        <>
          <p className="eyebrow">
            HIVClinExp Provider Network
          </p>

          <h1>Find a PrEP pharmacy near you</h1>

          <p className="flow-subtitle">
            Enter your city, town or suburb to find participating
            HIVClinExp providers.
          </p>

          <div className="question-card">
            <label htmlFor="city">
              City / Town
            </label>

            <input
              id="city"
              type="text"
              value={city}
              placeholder="e.g. Cape Town"
              onChange={(e) => {
                setCity(e.target.value);
                setSearchMessage("");
                setSearchError("");
                setPharmacies([]);
                setSelectedPharmacy(null);
              }}
            />

            <label
              htmlFor="suburb"
              style={{
                marginTop: "14px",
              }}
            >
              Suburb
            </label>

            <input
              id="suburb"
              type="text"
              value={suburb}
              placeholder="e.g. Claremont"
              onChange={(e) => {
                setSuburb(e.target.value);
                setSearchMessage("");
                setSearchError("");
                setPharmacies([]);
                setSelectedPharmacy(null);
              }}
            />

            <div
              style={{
                display: "flex",
                gap: "12px",
                flexWrap: "wrap",
                marginTop: "20px",
              }}
            >
              <button
                type="button"
                className="choice-button"
                onClick={() => setStep("care")}
              >
                ← Back
              </button>

              <button
                type="button"
                className="start-button"
                disabled={
                  searching ||
                  (!city.trim() && !suburb.trim())
                }
                onClick={searchPharmacies}
              >
                {searching
                  ? "Searching pharmacies..."
                  : "Find pharmacies near me"}
              </button>
            </div>

            {searchError && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "18px",
                  borderRadius: "14px",
                  background: "#fff4f2",
                  border: "1px solid #efcbc5",
                }}
              >
                <strong>
                  Unable to search pharmacies
                </strong>

                <p
                  style={{
                    marginTop: "6px",
                    marginBottom: 0,
                  }}
                >
                  {searchError}
                </p>
              </div>
            )}

            {searchMessage && (
              <div
                style={{
                  marginTop: "20px",
                  padding: "18px",
                  borderRadius: "14px",
                  background: "#f1f8f6",
                  border: "1px solid #cfe6df",
                }}
              >
                <strong>
                  {selectedPharmacy
                    ? "Pharmacy selected"
                    : "Search results"}
                </strong>

                <p
                  style={{
                    marginTop: "6px",
                    marginBottom: 0,
                  }}
                >
                  {searchMessage}
                </p>
              </div>
            )}
          </div>

          {/* =================================================
              PHARMACY RESULTS
          ================================================= */}

          {pharmacies.length > 0 && (
            <div style={{ marginTop: "30px" }}>
              <p className="eyebrow">
                HIVClinExp Provider Network
              </p>

              <h2>Participating pharmacies</h2>

              <p className="flow-subtitle">
                Select a pharmacy below.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: "16px",
                  marginTop: "20px",
                }}
              >
                {pharmacies.map((pharmacy, index) => {
                  const isSelected =
                    selectedPharmacy?.practice_no ===
                      pharmacy.practice_no &&
                    selectedPharmacy?.practice_name ===
                      pharmacy.practice_name;

                  const mapQuery =
                    pharmacy.practice_full_address ||
                    pharmacy.practice_name ||
                    "";

                  const mapUrl =
                    `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(
                      mapQuery
                    )}`;

                  return (
                    <div
                      key={
                        pharmacy.practice_no?.toString() ||
                        `${pharmacy.practice_name}-${index}`
                      }
                      className="question-card"
                      style={{
                        margin: 0,
                        border: isSelected
                          ? "2px solid #167565"
                          : undefined,
                        background: isSelected
                          ? "#f1f8f6"
                          : undefined,
                      }}
                    >
                      {isSelected && (
                        <p
                          style={{
                            marginTop: 0,
                            color: "#167565",
                            fontWeight: 700,
                          }}
                        >
                          ✓ Selected pharmacy
                        </p>
                      )}

                      <h3
                        style={{
                          marginTop: 0,
                          marginBottom: "12px",
                        }}
                      >
                        {pharmacy.practice_name ||
                          "Participating pharmacy"}
                      </h3>

                      {pharmacy.practice_full_address && (
                        <p style={{ margin: "8px 0" }}>
                          <strong>Address:</strong>{" "}
                          {pharmacy.practice_full_address}
                        </p>
                      )}

                      {pharmacy.practice_province && (
                        <p style={{ margin: "8px 0" }}>
                          <strong>Province:</strong>{" "}
                          {pharmacy.practice_province}
                        </p>
                      )}

                      {pharmacy.practice_contact_no && (
                        <p style={{ margin: "8px 0" }}>
                          <strong>Telephone:</strong>{" "}
                          <a
                            href={`tel:${pharmacy.practice_contact_no}`}
                          >
                            {pharmacy.practice_contact_no}
                          </a>
                        </p>
                      )}

                      <div
                        style={{
                          display: "flex",
                          gap: "10px",
                          flexWrap: "wrap",
                          marginTop: "16px",
                        }}
                      >
                        <button
                          type="button"
                          className="start-button"
                          onClick={() =>
                            selectPharmacy(pharmacy)
                          }
                        >
                          {isSelected
                            ? "✓ Pharmacy selected"
                            : "Select this pharmacy"}
                        </button>

                        {mapQuery && (
                          <a
                            href={mapUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="choice-button"
                            style={{
                              textDecoration: "none",
                              display: "inline-flex",
                              alignItems: "center",
                              justifyContent: "center",
                            }}
                          >
                            View map
                          </a>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ===============================================
                  SELECTED PHARMACY
              =============================================== */}

              {selectedPharmacy && (
                <div
                  id="pharmacy-confirmation"
                  className="question-card"
                  style={{
                    marginTop: "24px",
                    border: "2px solid #167565",
                    background: "#f1f8f6",
                  }}
                >
                  <p
                    className="eyebrow"
                    style={{
                      color: "#167565",
                      marginTop: 0,
                    }}
                  >
                    ✓ Pharmacy selected
                  </p>

                  <h2>
                    {selectedPharmacy.practice_name ||
                      "Selected pharmacy"}
                  </h2>

                  {selectedPharmacy.practice_full_address && (
                    <p>
                      <strong>Address:</strong>{" "}
                      {
                        selectedPharmacy.practice_full_address
                      }
                    </p>
                  )}

                  {selectedPharmacy.practice_contact_no && (
                    <p>
                      <strong>Telephone:</strong>{" "}
                      <a
                        href={`tel:${selectedPharmacy.practice_contact_no}`}
                      >
                        {
                          selectedPharmacy.practice_contact_no
                        }
                      </a>
                    </p>
                  )}

                  <p>
                    Your selected pharmacy has been added to
                    your HIV prevention pathway.
                  </p>

                  <button
                    type="button"
                    className="start-button"
                    onClick={continueWithSelectedPharmacy}
                  >
                    Continue →
                  </button>
                </div>
              )}
            </div>
          )}
        </>
      )}
    </>
  );
}
