"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

const tests = [
  { value: "mylan_atomo", name: "Mylan / Atomo HIV Self Test", sample: "Blood" },
  { value: "oraquick", name: "OraQuick HIV Self-Test", sample: "Oral Fluid" },
  { value: "unknown", name: "I'm not sure which test I'm using", sample: "" },
] as const;

export default function TestPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const continueFlow = () => {
    if (!selected) return;
    sessionStorage.setItem("selected_test", selected);
    router.push(selected === "mylan_atomo" || selected === "oraquick" ? "/test/photo" : "/test/identify");
  };

  return <main className="flow-page"><header className="nav flow-nav"><Link className="brand" href="/"><span className="brand-mark">+</span> HIVClinTest</Link><div className="confidential">Private and confidential</div></header><section className="flow-shell test-shell" aria-labelledby="test-title"><Link className="back-link" href="/register">Back</Link><div className="flow-heading"><p className="eyebrow">Step 2 of 2</p><h1 id="test-title">Select Your HIV Self-Test</h1><p className="flow-subtitle">Which HIV self-test are you using?</p></div><div className="test-options" role="list">{tests.map((test) => <button key={test.value} className={`test-card${selected === test.value ? " selected" : ""}`} type="button" onClick={() => setSelected(test.value)} role="listitem" aria-pressed={selected === test.value}><span className="test-radio" aria-hidden="true">{selected === test.value ? "✓" : ""}</span><span><strong>{test.name}</strong>{test.sample && <small>Sample: {test.sample}</small>}</span></button>)}</div><p className="screening-note">This is a screening support service. A reactive self-test result is not a confirmed HIV diagnosis and will require confirmatory testing.</p><button className="start-button continue-button" type="button" disabled={!selected} onClick={continueFlow}>Continue</button></section></main>;
}
