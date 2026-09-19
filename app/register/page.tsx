"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const initialForm = {
  first_name: "",
  surname: "",
  gender: "",
  country: "South Africa",
  identity_type: "",
  identity_number: "",
  date_of_birth: "",
  mobile_number: "",
  consent: false,
};

export default function RegisterPage() {
  const router = useRouter();
  const [form, setForm] = useState(initialForm);
  const canContinue = useMemo(
    () =>
      Boolean(
        form.first_name.trim() &&
          form.surname.trim() &&
          form.gender &&
          form.identity_type &&
          form.identity_number.trim() &&
          form.date_of_birth &&
          form.consent,
      ),
    [form],
  );

  function updateField(field: keyof typeof form, value: string | boolean) {
    setForm((current) => ({
      ...current,
      [field]: value,
      ...(field === "country" ? { identity_type: "" } : {}),
    }));
  }

  const identityOptions = form.country === "South Africa"
    ? ["South African ID", "Passport"]
    : ["National ID", "Passport"];

  const mobilePlaceholder = {
    "South Africa": "+27",
    England: "+44",
    Zimbabwe: "+263",
    Botswana: "+267",
    Eswatini: "+268",
    Lesotho: "+266",
    Other: "",
  }[form.country];

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!canContinue) return;

    const response = await fetch("/api/patients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, source: "manual" }),
    });

    if (!response.ok) return;

    const { patient_id } = await response.json();
    sessionStorage.setItem("patient_id", patient_id);
    sessionStorage.setItem(
      "hivclintest_registration",
      JSON.stringify({ ...form, source: "manual", created_at: new Date().toISOString() }),
    );
    router.push("/test");
  }

  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">+</span> HIVClinTest
        </Link>
        <div className="confidential">Private and confidential</div>
      </header>

      <section className="flow-shell" aria-labelledby="registration-title">
        <Link className="back-link" href="/">Back to home</Link>
        <div className="flow-heading">
          <p className="eyebrow">Step 1 of 2</p>
          <h1 id="registration-title">Patient Registration</h1>
          <p className="flow-subtitle">
            Please provide your details before starting the HIV self-test process.
          </p>
        </div>

        <form className="registration-form" onSubmit={handleSubmit}>
          <div className="form-grid">
            <label className="field">
              <span>First Name <b aria-hidden="true">*</b></span>
              <input required value={form.first_name} onChange={(event) => updateField("first_name", event.target.value)} />
            </label>
            <label className="field">
              <span>Surname <b aria-hidden="true">*</b></span>
              <input required value={form.surname} onChange={(event) => updateField("surname", event.target.value)} />
            </label>
          </div>

          <label className="field">
            <span>Gender <b aria-hidden="true">*</b></span>
            <select required value={form.gender} onChange={(event) => updateField("gender", event.target.value)}>
              <option value="">Select gender</option>
              <option>Male</option><option>Female</option><option>Other</option><option>Prefer not to say</option>
            </select>
          </label>

          <label className="field">
            <span>Country <b aria-hidden="true">*</b></span>
            <select required value={form.country} onChange={(event) => updateField("country", event.target.value)}>
              <option>South Africa</option>
              <option>England</option>
              <option>Zimbabwe</option>
              <option>Botswana</option>
              <option>Eswatini</option>
              <option>Lesotho</option>
              <option>Other</option>
            </select>
          </label>

          <div className="form-grid">
            <label className="field">
              <span>Identification Type <b aria-hidden="true">*</b></span>
              <select required value={form.identity_type} onChange={(event) => updateField("identity_type", event.target.value)}>
                <option value="">Select type</option>
                {identityOptions.map((option) => <option key={option}>{option}</option>)}
              </select>
            </label>
            <label className="field">
              <span>ID Number / Passport Number <b aria-hidden="true">*</b></span>
              <input required value={form.identity_number} onChange={(event) => updateField("identity_number", event.target.value)} />
            </label>
          </div>

          <div className="form-grid">
            <label className="field"><span>Date of Birth <b aria-hidden="true">*</b></span><input required type="date" value={form.date_of_birth} onChange={(event) => updateField("date_of_birth", event.target.value)} /></label>
            <label className="field"><span>Mobile Number</span><input type="tel" placeholder={mobilePlaceholder} value={form.mobile_number} onChange={(event) => updateField("mobile_number", event.target.value)} /></label>
          </div>

          <label className="consent-field">
            <input type="checkbox" checked={form.consent} onChange={(event) => updateField("consent", event.target.checked)} />
            <span>I consent to the processing of my personal information for HIV self-testing support, result interpretation and linkage to appropriate healthcare services.</span>
          </label>
          <button className="start-button continue-button" type="submit" disabled={!canContinue}>Continue to self-test</button>
        </form>
      </section>
    </main>
  );
}
