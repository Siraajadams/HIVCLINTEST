"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useEffect } from "react";

interface Interpretation {
  result: "non_reactive" | "reactive" | "invalid" | "uncertain";
  confidence: "high" | "medium" | "low";
  reason: string;
  test_type: string;
}

export default function ReviewPage() {
  const router = useRouter();
  const [interpretation, setInterpretation] = useState<Interpretation | null>(null);
  const [image, setImage] = useState<string | null>(null);
  const [showManualChoice, setShowManualChoice] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const stored = sessionStorage.getItem("ai_interpretation");
    const storedImage = sessionStorage.getItem("test_image");

    if (stored && storedImage) {
      setInterpretation(JSON.parse(stored));
      setImage(storedImage);
    } else {
      router.push("/test/photo");
    }
  }, [router]);

  const handleConfirmYes = () => {
    if (interpretation?.result === "uncertain") {
      setShowManualChoice(true);
      return;
    }

    if (interpretation) {
      sessionStorage.setItem("interpretation_method", "ai");
      sessionStorage.setItem("ai_suggested_result", interpretation.result);
      sessionStorage.setItem("ai_confidence", interpretation.confidence);
      sessionStorage.setItem("test_result", interpretation.result);

      // Route to appropriate result page
      if (interpretation.result === "non_reactive") {
        router.push("/result/non-reactive");
      } else if (interpretation.result === "reactive") {
        router.push("/result/reactive");
      } else if (interpretation.result === "invalid") {
        router.push("/result/invalid");
      }
    }
  };

  const handleManualChoice = (result: string) => {
    setIsLoading(true);
    sessionStorage.setItem("interpretation_method", "manual");
    sessionStorage.setItem("ai_suggested_result", interpretation?.result || "");
    sessionStorage.setItem("ai_confidence", interpretation?.confidence || "");
    sessionStorage.setItem("test_result", result);

    if (result === "non_reactive") {
      router.push("/result/non-reactive");
    } else if (result === "reactive") {
      router.push("/result/reactive");
    } else if (result === "invalid") {
      router.push("/result/invalid");
    }
  };

  if (!interpretation || !image) {
    return (
      <main className="flow-page">
        <header className="nav flow-nav">
          <Link className="brand" href="/">
            <span className="brand-mark">+</span> HIVClinTest
          </Link>
          <div className="confidential">Private and confidential</div>
        </header>
        <section className="flow-shell">
          <p style={{ color: "var(--muted)" }}>Loading...</p>
        </section>
      </main>
    );
  }

  const resultDisplay = {
    non_reactive: "Non-reactive",
    reactive: "Reactive",
    invalid: "Invalid",
    uncertain: "Unable to determine",
  };

  const confidenceDisplay = {
    high: "High confidence",
    medium: "Medium confidence",
    low: "Low confidence",
  };

  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">+</span> HIVClinTest
        </Link>
        <div className="confidential">Private and confidential</div>
      </header>

      <section className="flow-shell photo-shell" aria-labelledby="review-title">
        <Link className="back-link" href="/test/photo">
          Back
        </Link>

        <div className="flow-heading">
          <p className="eyebrow">Step 4 of 4</p>
          <h1 id="review-title">Review Test Interpretation</h1>
          <p className="flow-subtitle">AI-assisted test interpretation</p>
        </div>

        {!showManualChoice ? (
          <>
            <div className="review-card">
              <div className="review-image">
                <img src={image} alt="Your test" />
              </div>

              <div className="interpretation-results">
                <h2>Test Analysis</h2>

                <div className="result-info">
                  <p className="label">Test Type</p>
                  <p className="value">{interpretation.test_type}</p>
                </div>

                <div className="result-info">
                  <p className="label">Suggested Result</p>
                  <p className="value result-highlight">{resultDisplay[interpretation.result]}</p>
                </div>

                <div className="result-info">
                  <p className="label">Confidence</p>
                  <p className="value">{confidenceDisplay[interpretation.confidence]}</p>
                </div>

                <div className="result-info">
                  <p className="label">Visual Analysis</p>
                  <p className="value">{interpretation.reason}</p>
                </div>

                {interpretation.result === "reactive" && (
                  <div className="important-note">
                    A reactive HIV self-test is not a confirmed HIV diagnosis. Confirmatory testing by a healthcare professional is required.
                  </div>
                )}

                {interpretation.result === "uncertain" && (
                  <div className="uncertain-notice">
                    We couldn&apos;t reliably interpret this image. Please choose one of the options below or take another photo.
                  </div>
                )}

                {interpretation.result === "invalid" && (
                  <div className="uncertain-notice">The test appears invalid. This may indicate a testing error or that the test was not performed correctly.</div>
                )}
              </div>

              <div className="confirmation-section">
                <h3>Does this match what you see on your test?</h3>

                <div className="confirmation-buttons">
                  <button className="start-button" type="button" onClick={handleConfirmYes}>
                    Yes, Continue
                  </button>

                  <button
                    className="choice-button"
                    type="button"
                    onClick={() => setShowManualChoice(true)}
                  >
                    No, Choose Manually
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <>
            <div className="manual-choice-section">
              <h2>Select Your Test Result</h2>
              <p className="flow-subtitle">Choose the result that matches your test:</p>

              <div className="manual-options">
                <button
                  className="choice-button large"
                  type="button"
                  onClick={() => handleManualChoice("non_reactive")}
                  disabled={isLoading}
                >
                  <strong>Non-reactive</strong>
                  <span>No antibodies detected</span>
                </button>

                <button
                  className="choice-button large"
                  type="button"
                  onClick={() => handleManualChoice("reactive")}
                  disabled={isLoading}
                >
                  <strong>Reactive</strong>
                  <span>Antibodies detected</span>
                </button>

                <button
                  className="choice-button large"
                  type="button"
                  onClick={() => handleManualChoice("invalid")}
                  disabled={isLoading}
                >
                  <strong>Invalid</strong>
                  <span>Test did not work properly</span>
                </button>
              </div>

              <button
                className="back-link"
                type="button"
                onClick={() => setShowManualChoice(false)}
                style={{ marginTop: "20px" }}
              >
                ← Back to AI Result
              </button>
            </div>
          </>
        )}

        <p className="screening-note">This tool provides educational support and does not provide a definitive diagnosis.</p>
      </section>
    </main>
  );
}
