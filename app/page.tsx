"use client";

import { useState } from "react";

export default function HomePage() {
  const [form, setForm] = useState({
    first_name: "",
    surname: "",
    gender: "",
    identity_type: "id",
    identity_number: "",
    date_of_birth: "",
  });

  const [message, setMessage] = useState("");

  function updateField(
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) {
    setForm({
      ...form,
      [e.target.name]: e.target.value,
    });
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setMessage("Saving...");

    try {
      const response = await fetch("/api/patients", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await response.json();

      if (!response.ok) {
        setMessage(data.error || "Unable to save patient.");
        return;
      }

      setMessage("Patient successfully registered.");

      setForm({
        first_name: "",
        surname: "",
        gender: "",
        identity_type: "id",
        identity_number: "",
        date_of_birth: "",
      });
    } catch {
      setMessage("Something went wrong.");
    }
  }

  return (
    <main className="container">
      <div className="card">
        <div className="logo">HIVClinTest</div>

        <h1>HIV Self-Test Results Interpreter</h1>

        <p className="subtitle">
          Register the patient before interpreting an HIV self-test result.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="grid">
            <div>
              <label>First Name</label>
              <input
                name="first_name"
                value={form.first_name}
                onChange={updateField}
                required
              />
            </div>

            <div>
              <label>Surname</label>
              <input
                name="surname"
                value={form.surname}
                onChange={updateField}
                required
              />
            </div>

            <div>
              <label>Gender</label>
              <select
                name="gender"
                value={form.gender}
                onChange={updateField}
                required
              >
                <option value="">Select gender</option>
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="other">Other</option>
                <option value="prefer_not_to_say">
                  Prefer not to say
                </option>
              </select>
            </div>

            <div>
              <label>Date of Birth</label>
              <input
                type="date"
                name="date_of_birth"
                value={form.date_of_birth}
                onChange={updateField}
                required
              />
            </div>

            <div>
              <label>Identification Type</label>
              <select
                name="identity_type"
                value={form.identity_type}
                onChange={updateField}
              >
                <option value="id">South African ID</option>
                <option value="passport">Passport</option>
              </select>
            </div>

            <div>
              <label>
                {form.identity_type === "id"
                  ? "ID Number"
                  : "Passport Number"}
              </label>

              <input
                name="identity_number"
                value={form.identity_number}
                onChange={updateField}
                required
              />
            </div>
          </div>

          <button type="submit">Continue</button>

          {message && <p className="message">{message}</p>}
        </form>

        <div className="notice">
          Patient information may be entered manually or supplied through the
          WhatsApp integration.
        </div>
      </div>
    </main>
  );
}
