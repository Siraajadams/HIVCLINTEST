"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

type Step =
  | "timing"
  | "risk"
  | "symptoms"
  | "prep"
  | "location";

export default function AssessmentPage() {
  const searchParams = useSearchParams();

  const exposure = searchParams.get("exposure") || "unsure";

  const [step, setStep] = useState<Step>(
    exposure === "no" ? "risk" : "timing"
  );

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
    setRisk((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  function toggleSymptom(key: keyof typeof symptoms) {
    setSymptoms((previous) => ({
      ...previous,
      [key]: !previous[key],
    }));
  }

  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">+</span> HIVClinTest
        </Link>

        <div className="confidential">
          Private and confidential
        </div>
      </header>

      <section className="flow-shell">

        <Link
          className="back-link"
          href="/result/non-reactive"
        >
          Back
        </Link>

        <p className="eyebrow">
          HIV prevention assessment
        </p>

        {/* STEP 1 — EXPOSURE TIMING */}

        {step === "timing" && (
          <>
            <h1>When was the possible HIV exposure?</h1>

            <p className="flow-subtitle">
              This helps us identify whether you may need
              urgent assessment for PEP.
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
                    onClick={() =>
                      setExposureTiming(value)
                    }
                  >
                    {label}
                  </button>
                ))}

              </div>
            </div>

            {pepUrgent && (
              <div className="question-card">
                <p className="eyebrow">
                  Time-sensitive
                </p>

                <h2>
                  You may need urgent assessment for PEP
                </h2>

                <p>
                  PEP is medicine used after a possible HIV
                  exposure. It needs to be started as soon as
                  possible and no later than 72 hours after
                  exposure.
                </p>

                <p>
                  Please seek urgent assessment from an
                  appropriate healthcare professional or
                  healthcare facility.
                </p>
              </div>
            )}

            <button
              className="start-button"
              type="button"
              disabled={!exposureTiming}
              onClick={() => setStep("risk")}
            >
              Continue
            </button>
          </>
        )}

        {/* STEP 2 — HIV RISK */}

        {step === "risk" && (
          <>
            <h1>A few questions about HIV prevention</h1>

            <p className="flow-subtitle">
              Select any that apply to you during the last
              6 months. You can continue if none apply.
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
                  onClick={() =>
                    toggleRisk("condomlessSex")
                  }
                >
                  I have had sex without a condom
                </button>

                <button
                  type="button"
                  className={
                    risk.multiplePartners
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  onClick={() =>
                    toggleRisk("multiplePartners")
                  }
                >
                  I have had more than one sexual partner
                </button>

                <button
                  type="button"
                  className={
                    risk.partnerPositive
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  onClick={() =>
                    toggleRisk("partnerPositive")
                  }
                >
                  I have a sexual partner living with HIV
                </button>

                <button
                  type="button"
                  className={
                    risk.partnerUnknown
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  onClick={() =>
                    toggleRisk("partnerUnknown")
                  }
                >
                  I am unsure of a sexual partner&apos;s HIV
                  status
                </button>

                <button
                  type="button"
                  className={
                    risk.recentSTI
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  onClick={() =>
                    toggleRisk("recentSTI")
                  }
                >
                  I have recently been diagnosed with an STI
                </button>

              </div>
            </div>

            <button
              className="start-button"
              type="button"
              onClick={() => setStep("symptoms")}
            >
              Continue
            </button>
          </>
        )}

        {/* STEP 3 — STI SYMPTOMS */}

        {step === "symptoms" && (
          <>
            <h1>Do you currently have any of these symptoms?</h1>

            <p className="flow-subtitle">
              Select all that apply.
            </p>

            <div className="question-card">
              <div className="choice-column">

                <button
                  className={
                    symptoms.genitalSore
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  type="button"
                  onClick={() =>
                    toggleSymptom("genitalSore")
                  }
                >
                  Genital sore or ulcer
                </button>

                <button
                  className={
                    symptoms.discharge
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  type="button"
                  onClick={() =>
                    toggleSymptom("discharge")
                  }
                >
                  Unusual genital discharge
                </button>

                <button
                  className={
                    symptoms.painfulUrination
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  type="button"
                  onClick={() =>
                    toggleSymptom("painfulUrination")
                  }
                >
                  Pain or burning when urinating
                </button>

                <button
                  className={
                    symptoms.genitalRash
                      ? "choice-button selected"
                      : "choice-button"
                  }
                  type="button"
                  onClick={() =>
                    toggleSymptom("genitalRash")
                  }
                >
                  Genital rash
                </button>

              </div>
            </div>

            <button
              className="start-button"
              type="button"
              onClick={() => setStep("prep")}
            >
              Continue
            </button>
          </>
        )}

        {/* STEP 4 — PREP */}

        {step === "prep" && (
          <>
            <p className="eyebrow">HIV prevention</p>

            <h1>Would you like to learn about PrEP?</h1>

            <p className="flow-subtitle">
              PrEP is medicine used by HIV-negative people
              to reduce their chance of acquiring HIV.
            </p>

            <div className="question-card">
              <div className="choice-column">

                <button
                  className="choice-button"
                  type="button"
                  onClick={() => {
                    setPrepInterest("yes");
                    setStep("location");
                  }}
                >
                  Yes — I&apos;d like PrEP
                </button>

                <button
                  className="choice-button"
                  type="button"
                  onClick={() => {
                    setPrepInterest("doctor");
                    setStep("location");
                  }}
                >
                  I&apos;d like to speak to a healthcare
                  professional
                </button>

                <button
                  className="choice-button"
                  type="button"
                  onClick={() =>
                    setPrepInterest("information")
                  }
                >
                  Tell me more about PrEP
                </button>

                <button
                  className="choice-button"
                  type="button"
                  onClick={() =>
                    setPrepInterest("not_now")
                  }
                >
                  Not now
                </button>

              </div>
            </div>

            {prepInterest === "information" && (
              <div className="question-card">
                <h2>What is PrEP?</h2>

                <p>
                  PrEP is HIV prevention medication for
                  people who do not have HIV. A healthcare
                  professional can assess whether PrEP is
                  appropriate for you.
                </p>

                <button
                  className="start-button"
                  type="button"
                  onClick={() => setStep("location")}
                >
                  Find a PrEP provider
                </button>
              </div>
            )}
          </>
        )}

        {/* STEP 5 — LOCATION */}

        {step === "location" && (
          <>
            <p className="eyebrow">
              HIVClinExp provider network
            </p>

            <h1>Find a PrEP pharmacy near you</h1>

            <p className="flow-subtitle">
              Enter your city and suburb to find participating
              HIVClinExp providers within 10 km.
            </p>

            <div className="question-card">

              <label>
                City / Town
                <input
                  type="text"
                  value={city}
                  onChange={(event) =>
                    setCity(event.target.value)
                  }
                  placeholder="e.g. Cape Town"
                />
              </label>

              <label>
                Suburb
                <input
                  type="text"
                  value={suburb}
                  onChange={(event) =>
                    setSuburb(event.target.value)
                  }
                  placeholder="e.g. Claremont"
                />
              </label>

              <button
                className="start-button"
                type="button"
                disabled={!city || !suburb}
                onClick={() => {
                  console.log({
                    exposure,
                    exposureTiming,
                    pepUrgent,
                    risk,
                    symptoms,
                    prepInterest,
                    city,
                    suburb,
                  });

                  alert(
                    "Assessment complete. Pharmacy search will be connected next."
                  );
                }}
              >
                Find pharmacies within 10 km
              </button>

            </div>
          </>
        )}

        <p className="screening-note">
          HIVClinTest provides educational support and does
          not replace assessment by a healthcare professional.
        </p>

      </section>
    </main>
  );
}
