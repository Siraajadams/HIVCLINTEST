"use client";

import Link from "next/link";
import { useState } from "react";

export default function NonReactivePage() {
  const [savedAnswer, setSavedAnswer] = useState<string | null>(null);

  async function saveExposure(possibleExposure: "yes" | "no" | "unsure") {
    const patientId = sessionStorage.getItem("patient_id");
    if (!patientId) return;

    const response = await fetch("/api/exposure", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        patient_id: patientId,
        self_test_id: sessionStorage.getItem("self_test_id"),
        possible_exposure: possibleExposure,
      }),
    });

    if (response.ok) setSavedAnswer(possibleExposure);
  }

  return <main className="flow-page"><header className="nav flow-nav"><Link className="brand" href="/"><span className="brand-mark">+</span> HIVClinTest</Link><div className="confidential">Private and confidential</div></header><section className="flow-shell result-shell"><Link className="back-link" href="/test">Back</Link><p className="eyebrow">Your result</p><h1>Your self-test result is non-reactive</h1><p className="result-lead">No HIV antibodies were detected by this self-test.</p><p className="flow-subtitle">A non-reactive result does not always exclude recent HIV infection. If you have had a recent possible exposure, repeat testing or professional testing may be needed.</p><div className="question-card"><h2>Have you had a possible HIV exposure recently?</h2><div className="choice-row"><button className="choice-button" type="button" onClick={() => saveExposure("yes")} disabled={Boolean(savedAnswer)}>Yes</button><button className="choice-button" type="button" onClick={() => saveExposure("no")} disabled={Boolean(savedAnswer)}>No</button><button className="choice-button" type="button" onClick={() => saveExposure("unsure")} disabled={Boolean(savedAnswer)}>I&apos;m not sure</button></div>{savedAnswer && <p className="screening-note" role="status">Your answer has been saved.</p>}</div><p className="screening-note">This tool provides educational support and does not provide a definitive diagnosis.</p></section></main>;
}
