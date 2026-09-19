"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";

const options = [
  ["non_reactive", "One control line only", "Non-reactive"],
  ["reactive", "Control line and test line", "Reactive"],
  ["invalid", "No control line", "Invalid test"],
] as const;

export default function MylanAtomoPage() {
  const router = useRouter();
  const [selected, setSelected] = useState("");
  const continueFlow = () => { if (selected) { sessionStorage.setItem("test_result", selected); router.push(`/result/${selected.replace("_", "-")}`); } };
  return <main className="flow-page"><header className="nav flow-nav"><Link className="brand" href="/"><span className="brand-mark">+</span> HIVClinTest</Link><div className="confidential">Private and confidential</div></header><section className="flow-shell test-shell"><Link className="back-link" href="/test">Back</Link><div className="flow-heading"><p className="eyebrow">Step 2 of 4 — Test Result</p><h1>Mylan / Atomo HIV Self Test</h1><p className="flow-subtitle">Blood-based HIV self-test</p></div><ResultOptions selected={selected} setSelected={setSelected} /><p className="screening-note">Any visible test line should be treated as reactive, even if the line is faint. A reactive self-test is not a confirmed HIV-positive diagnosis.</p><button className="start-button continue-button" type="button" disabled={!selected} onClick={continueFlow}>Continue</button></section></main>;
}

function ResultOptions({ selected, setSelected }: { selected: string; setSelected: (value: string) => void }) { return <div className="test-options" role="list" aria-label="Test result options">{options.map(([value, title, label]) => <button key={value} className={`test-card result-card${selected === value ? " selected" : ""}`} type="button" onClick={() => setSelected(value)}><span className="test-radio" aria-hidden="true">{selected === value ? "✓" : ""}</span><span><strong>{label}</strong><small>{title}</small></span></button>)}</div>; }

export { ResultOptions };

const _options = options;
void _options;
