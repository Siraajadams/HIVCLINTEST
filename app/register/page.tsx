
"use client";

import { FormEvent, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

const initialForm = {
  first_name: "",
  surname: "",
  email: "",
  gender: "",
  country: "South Africa",
  identity_type: "",
  identity_number: "",
  date_of_birth: "",
  mobile_number: "",
  consent: false,
};

type RegistrationForm = typeof initialForm;
type FormField = keyof RegistrationForm;

// Check the South African ID checksum using Luhn.
function isValidSAID(id: string): boolean {
  if (!/^\d{13}$/.test(id)) return false;

  let sum = 0;
  let doubleDigit = false;

  for (let i = id.length - 1; i >= 0; i--) {
    let digit = Number(id[i]);

    if (doubleDigit) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }

    sum += digit;
    doubleDigit = !doubleDigit;
  }

  return sum % 10 === 0;
}

// Extract DOB from a South African ID.
// Returns YYYY-MM-DD or an empty string.
function getDOBFromSAID(id: string): string {
  if (!isValidSAID(id)) return "";

  const yy = Number(id.slice(0, 2));
  const mm = Number(id.slice(2, 4));
  const dd = Number(id.slice(4, 6));

  const today = new Date();
  const currentYear = today.getFullYear();

  const year =
    2000 + yy <= currentYear
      ? 2000 + yy
      : 1900 + yy;

  const dob = new Date(
    Date.UTC(year, mm - 1, dd)
  );

  if (
    dob.getUTCFullYear() !== year ||
    dob.getUTCMonth() !== mm - 1 ||
    dob.getUTCDate() !== dd
  ) {
    return "";
  }

  // Do not accept a future date.
  const todayUTC = Date.UTC(
    today.getFullYear(),
    today.getMonth(),
    today.getDate()
  );

  if (dob.getTime() > todayUTC) return "";

  return [
    year,
    String(mm).padStart(2, "0"),
    String(dd).padStart(2, "0"),
  ].join("-");
}

export default function RegisterPage() {
  const router = useRouter();

  const [form, setForm] =
    useState<RegistrationForm>(initialForm);

  const isSAID =
    form.country === "South Africa" &&
    form.identity_type === "South African ID";

  const autoDOB = isSAID
    ? getDOBFromSAID(form.identity_number)
    : "";

  const invalidSAID =
    isSAID &&
    form.identity_number.length === 13 &&
    !autoDOB;

  const canContinue = useMemo(() => {
    const basicValid = Boolean(
      form.first_name.trim() &&
      form.surname.trim() &&
      form.email.trim() &&
      form.gender &&
      form.country &&
      form.identity_type &&
      form.identity_number.trim() &&
      form.date_of_birth &&
      form.consent
    );

    if (!basicValid) return false;

    if (isSAID) {
      return (
        Boolean(autoDOB) &&
        form.date_of_birth === autoDOB
      );
    }

    return true;
  }, [form, isSAID, autoDOB]);

  function updateField(
    field: FormField,
    value: string | boolean
  ) {
    setForm((current) => {
      const updated = {
        ...current,
        [field]: value,
      };

      // Reset ID and DOB when country changes.
      if (field === "country") {
        updated.identity_type = "";
        updated.identity_number = "";
        updated.date_of_birth = "";
      }

      // Reset ID and DOB when ID type changes.
      if (field === "identity_type") {
        updated.identity_number = "";
        updated.date_of_birth = "";
      }

      // Automatically extract DOB from SA ID.
      if (field === "identity_number") {
        const id = String(value);

        if (
          updated.country === "South Africa" &&
          updated.identity_type ===
            "South African ID"
        ) {
          // Accept digits only, maximum 13.
          const cleanID = id
            .replace(/\D/g, "")
            .slice(0, 13);

          updated.identity_number = cleanID;
          updated.date_of_birth =
            getDOBFromSAID(cleanID);
        } else {
          updated.identity_number = id;
        }
      }

      return updated;
    });
  }

  const identityOptions =
    form.country === "South Africa"
      ? ["South African ID", "Passport"]
      : ["National ID", "Passport"];

  const mobilePlaceholder =
    ({
      "South Africa": "+27",
      England: "+44",
      Zimbabwe: "+263",
      Botswana: "+267",
      Eswatini: "+268",
      Lesotho: "+266",
      Other: "",
    } as Record<string, string>)[form.country] ||
    "";

  function handleSubmit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    if (!canContinue) return;

    const registration = {
      ...form,
      source: "manual",
      created_at: new Date().toISOString(),
    };

    sessionStorage.setItem(
      "hivclintest_registration",
      JSON.stringify(registration)
    );

    router.push("/test");
  }

  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">+</span>{" "}
          HIVClinTest
        </Link>

        <div className="confidential">
          Private and confidential
        </div>
      </header>

      <section
        className="flow-shell"
        aria-labelledby="registration-title"
      >
        <Link className="back-link" href="/">
          Back to home
        </Link>

        <div className="flow-heading">
          <p className="eyebrow">
            Step 1 of 2
          </p>

          <h1 id="registration-title">
            Patient Registration
          </h1>

          <p className="flow-subtitle">
            Please provide your details before
            starting the HIV self-test process.
          </p>
        </div>

        <form
          className="registration-form"
          onSubmit={handleSubmit}
        >
          <div className="form-grid">
            <label className="field">
              <span>
                First Name{" "}
                <b aria-hidden="true">*</b>
              </span>

              <input
                required
                autoComplete="given-name"
                value={form.first_name}
                onChange={(event) =>
                  updateField(
                    "first_name",
                    event.target.value
                  )
                }
              />
            </label>

            <label className="field">
              <span>
                Surname{" "}
                <b aria-hidden="true">*</b>
              </span>

              <input
                required
                autoComplete="family-name"
                value={form.surname}
                onChange={(event) =>
                  updateField(
                    "surname",
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <label className="field">
            <span>
              Email{" "}
              <b aria-hidden="true">*</b>
            </span>

            <input
              required
              type="email"
              autoComplete="email"
              placeholder="name@example.com"
              value={form.email}
              onChange={(event) =>
                updateField(
                  "email",
                  event.target.value
                )
              }
            />
          </label>

          <label className="field">
            <span>
              Gender{" "}
              <b aria-hidden="true">*</b>
            </span>

            <select
              required
              value={form.gender}
              onChange={(event) =>
                updateField(
                  "gender",
                  event.target.value
                )
              }
            >
              <option value="">
                Select gender
              </option>

              <option>Male</option>
              <option>Female</option>
              <option>Other</option>
              <option>Prefer not to say</option>
            </select>
          </label>

          <label className="field">
            <span>
              Country{" "}
              <b aria-hidden="true">*</b>
            </span>

            <select
              required
              value={form.country}
              onChange={(event) =>
                updateField(
                  "country",
                  event.target.value
                )
              }
            >
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
              <span>
                Identification Type{" "}
                <b aria-hidden="true">*</b>
              </span>

              <select
                required
                value={form.identity_type}
                onChange={(event) =>
                  updateField(
                    "identity_type",
                    event.target.value
                  )
                }
              >
                <option value="">
                  Select type
                </option>

                {identityOptions.map(
                  (option) => (
                    <option
                      key={option}
                      value={option}
                    >
                      {option}
                    </option>
                  )
                )}
              </select>
            </label>

            <label className="field">
              <span>
                ID Number / Passport Number{" "}
                <b aria-hidden="true">*</b>
              </span>

              <input
                required
                type="text"
                inputMode={
                  isSAID ? "numeric" : "text"
                }
                maxLength={
                  isSAID ? 13 : undefined
                }
                placeholder={
                  isSAID
                    ? "Enter 13-digit SA ID"
                    : "Enter identification number"
                }
                value={form.identity_number}
                onChange={(event) =>
                  updateField(
                    "identity_number",
                    event.target.value
                  )
                }
                aria-invalid={invalidSAID}
              />

              {invalidSAID && (
                <small
                  role="alert"
                  style={{ color: "#b91c1c" }}
                >
                  Invalid South African ID.
                  Please check the number.
                </small>
              )}
            </label>
          </div>

          <div className="form-grid">
            <label className="field">
              <span>
                Date of Birth{" "}
                <b aria-hidden="true">*</b>
              </span>

              <input
                required
                type="date"
                value={form.date_of_birth}
                readOnly={isSAID}
                onChange={(event) =>
                  updateField(
                    "date_of_birth",
                    event.target.value
                  )
                }
                style={
                  isSAID && autoDOB
                    ? {
                        backgroundColor:
                          "#ecfdf5",
                        borderColor: "#059669",
                      }
                    : undefined
                }
              />

              {isSAID && (
                <small
                  style={{
                    color: "#047857",
                    marginTop: "5px",
                  }}
                >
                  {autoDOB
                    ? "Date of birth automatically populated from your ID."
                    : "Enter a valid 13-digit South African ID to populate your date of birth."}
                </small>
              )}
            </label>

            <label className="field">
              <span>Mobile Number</span>

              <input
                type="tel"
                autoComplete="tel"
                placeholder={mobilePlaceholder}
                value={form.mobile_number}
                onChange={(event) =>
                  updateField(
                    "mobile_number",
                    event.target.value
                  )
                }
              />
            </label>
          </div>

          <label className="consent-field">
            <input
              type="checkbox"
              checked={form.consent}
              onChange={(event) =>
                updateField(
                  "consent",
                  event.target.checked
                )
              }
            />

            <span>
              I consent to the processing of my
              personal information for HIV
              self-testing support, result
              interpretation and linkage to
              appropriate healthcare services.
            </span>
          </label>

          <button
            className="start-button continue-button"
            type="submit"
            disabled={!canContinue}
          >
            Continue to self-test
          </button>
        </form>
      </section>
    </main>
  );
}
