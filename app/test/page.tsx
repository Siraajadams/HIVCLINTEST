"use client";

import Link from "next/link";
import { useState } from "react";

const tests = [
  { name: "Mylan / Atomo HIV Self Test", sample: "Blood" },
  { name: "OraQuick HIV Self-Test", sample: "Oral Fluid" },
  { name: "I'm not sure which test I'm using", sample: "" },
];

export default function TestPage() {
  const [selected, setSelected] = useState("");

  return (
    <main className="flow-page">
      <header className="nav flow-nav"><Link className="brand" href="/"><span className="brand-mark">+</span> HIVClinTest</Link><div className="confidential">Private and confidential</div></header>
      <section className="flow-shell test-shell" aria-labelledby="test-title">
        <Link className="back-link" href="/register">Back</Link>
        <div className="flow-heading"><p className="eyebrow">Step 2 of 2</p><h1 id="test-title">Select Your HIV Self-Test</h1><p className="flow-subtitle">Which HIV self-test are you using?</p></div>
        <div className="test-options" role="list">
          {tests.map((test) => <button key={test.name} className={`test-card${selected === test.name ? " selected" : ""}`} type="button" onClick={() => setSelected(test.name)} role="listitem"><span className="test-radio" aria-hidden="true">{selected === test.name ? "✓" : ""}</span><span><strong>{test.name}</strong>{test.sample && <small>Sample: {test.sample}</small>}</span></button>)}
        </div>
        <p className="screening-note">This is a screening support service. A reactive self-test result is not a confirmed HIV diagnosis and will require confirmatory testing.</p>
      </section>
    </main>
  );
}
