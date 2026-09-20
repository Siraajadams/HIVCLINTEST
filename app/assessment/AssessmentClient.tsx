"use client";

import { useState } from "react";

type Step = "exposure" | "risk" | "symptoms" | "prep" | "location";

export default function AssessmentClient() {
  const [step, setStep] = useState<Step>("exposure");
  const [exposureTiming, setExposureTiming] = useState("");

  const [risk, setRisk] = useState({
    condomlessSex: false,
    multiplePartners: false,
    partnerPositive: false,
    partnerUnknown: false,
    recentSTI: false,
  });

  const [symptoms, setSymptoms] = useState({
    genitalSore: false,
    discharge: false,
    painfulUrination: false,
    genitalRash: false,
  });

  const [prepInterest, setPrepInterest] = useState("");

  const [city, setCity] = useState("");
  const [suburb, setSuburb] = useState("");

  const pepUrgent = [
    "within24",
    "24to48",
    "48to72",
  ].includes(exposureTiming);

  function toggleRisk(key: keyof typeof risk) {
    setRisk((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  function toggleSymptom(key: keyof typeof symptoms) {
    setSymptoms((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  }

  return (
    <>
      {step === "exposure" && (
        <>
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
                <button
                  key={value}
                  type="button"
                  className={
                    exposureTiming === value
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  onClick={() => setExposureTiming(value)}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          {pepUrgent && (
            <div className="question-card">
              <p className="eyebrow">URGENT</p>

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

      {step === "risk" && (
        <>
          <p className="eyebrow">HIV prevention</p>

          <h1>A few questions about your sexual health</h1>

          <p className="flow-subtitle">
            Select any that have applied to you during the
            last 6 months.
          </p>

          <div className="question-card">
            <div className="choice-column">

              <button
                type="button"
                className={
                  risk.condomlessSex
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() => toggleRisk("condomlessSex")}
              >
                Sex without a condom
              </button>

              <button
                type="button"
                className={
                  risk.multiplePartners
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() => toggleRisk("multiplePartners")}
              >
                More than one sexual partner
              </button>

              <button
                type="button"
                className={
                  risk.partnerPositive
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() => toggleRisk("partnerPositive")}
              >
                A sexual partner living with HIV
              </button>

              <button
                type="button"
                className={
                  risk.partnerUnknown
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() => toggleRisk("partnerUnknown")}
              >
                Unsure of a sexual partner&apos;s HIV status
              </button>

              <button
                type="button"
                className={
                  risk.recentSTI
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() => toggleRisk("recentSTI")}
              >
                Recently diagnosed with an STI
              </button>

            </div>
          </div>

          <button
            type="button"
            className="start-button"
            onClick={() => setStep("symptoms")}
          >
            Continue
          </button>
        </>
      )}

      {step === "symptoms" && (
        <>
          <p className="eyebrow">STI screening</p>

          <h1>Do you currently have any of these symptoms?</h1>

          <p className="flow-subtitle">
            Select all that apply. If you have none, simply
            continue.
          </p>

          <div className="question-card">
            <div className="choice-column">

              <button
                type="button"
                className={
                  symptoms.genitalSore
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() => toggleSymptom("genitalSore")}
              >
                Genital sore or ulcer
              </button>

              <button
                type="button"
                className={
                  symptoms.discharge
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() => toggleSymptom("discharge")}
              >
                Unusual genital discharge
              </button>

              <button
                type="button"
                className={
                  symptoms.painfulUrination
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() =>
                  toggleSymptom("painfulUrination")
                }
              >
                Pain or burning when urinating
              </button>

              <button
                type="button"
                className={
                  symptoms.genitalRash
                    ? "choice-button selected"
                    : "choice-button"
                }
                onClick={() => toggleSymptom("genitalRash")}
              >
                Genital rash
              </button>

            </div>
          </div>

          <button
            type="button"
            className="start-button"
            onClick={() => setStep("prep")}
          >
            Continue
          </button>
        </>
      )}

      {step === "prep" && (
        <>
          <p className="eyebrow">HIV prevention</p>

          <h1>Would you like to consider PrEP?</h1>

          <p className="flow-subtitle">
            PrEP is HIV prevention medication for people who
            do not have HIV. A healthcare professional can
            assess whether it is appropriate for you.
          </p>

          <div className="question-card">
            <div className="choice-column">

              <button
                type="button"
                className="choice-button"
                onClick={() => {
                  setPrepInterest("prep");
                  setStep("location");
                }}
              >
                Yes — I&apos;m interested in PrEP
              </button>

              <button
                type="button"
                className="choice-button"
                onClick={() => {
                  setPrepInterest("clinician");
                  setStep("location");
                }}
              >
                Speak to a healthcare professional
              </button>

              <button
                type="button"
                className="choice-button"
                onClick={() => {
                  setPrepInterest("services");
                  setStep("location");
                }}
              >
                Find HIV prevention services near me
              </button>

            </div>
          </div>
        </>
      )}

      {step === "location" && (
        <>
          <p className="eyebrow">
            HIVClinExp Provider Network
          </p>

          <h1>Find a PrEP pharmacy near you</h1>

          <p className="flow-subtitle">
            Enter your location to find participating
            HIVClinExp providers within 10 km.
          </p>

          <div className="question-card">

            <label>
              City / Town
            </label>

            <input
              type="text"
              value={city}
              placeholder="e.g. Cape Town"
              onChange={(e) => setCity(e.target.value)}
            />

            <label>
              Suburb
            </label>

            <input
              type="text"
              value={suburb}
              placeholder="e.g. Claremont"
              onChange={(e) => setSuburb(e.target.value)}
            />

            <button
              type="button"
              className="start-button"
              disabled={!city.trim() || !suburb.trim()}
              onClick={() => {
                console.log({
                  exposureTiming,
                  pepUrgent,
                  risk,
                  symptoms,
                  prepInterest,
                  city,
                  suburb,
                });

                alert(
                  "Assessment complete. HIVClinExp pharmacy search will be connected next."
                );
              }}
            >
              Find pharmacies within 10 km
            </button>

          </div>
        </>
      )}
    </>
  );
}
