
"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

const STORAGE_KEY = "hivclintest_assessment";

type CareChoice = "virtual_gp" | "in_person";

export default function ConfirmatoryTestingPage() {
  const router = useRouter();

  const [choice, setChoice] =
    useState<CareChoice | null>(null);

  const [loading, setLoading] = useState(false);

  function saveReferral(selected: CareChoice) {
    try {
      const existing = sessionStorage.getItem(
        STORAGE_KEY
      );

      let previous: Record<string, unknown> = {};

      if (existing) {
        const parsed: unknown = JSON.parse(existing);

        if (
          parsed !== null &&
          typeof parsed === "object" &&
          !Array.isArray(parsed)
        ) {
          previous = parsed as Record<
            string,
            unknown
          >;
        }
      }

      const updated = {
        ...previous,

        testResult: "reactive",
        test_result: "reactive",

        referralReason:
          "Reactive HIV self-test - confirmatory testing required",

        consultationReason:
          "Reactive HIV self-test - confirmatory testing required",

        carePreference: selected,

        referralType:
          "hiv_confirmatory_testing",

        referralStatus: "pending",

        requiresConfirmatoryTesting: true,
      };

      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(updated)
      );

      return true;
    } catch (error) {
      console.error(
        "Unable to save referral:",
        error
      );

      return false;
    }
  }

  function handleContinue() {
    if (!choice || loading) return;

    setLoading(true);

    const saved = saveReferral(choice);

    if (!saved) {
      alert(
        "Unable to save your selection. Please try again."
      );
      setLoading(false);
      return;
    }

    if (choice === "virtual_gp") {
      router.push("/assessment/virtual-gp");
      return;
    }

    // Display the in-person instructions below.
    // A pharmacy booking route can be connected
    // once its destination is confirmed.
    setLoading(false);
    setShowInPerson(true);
  }

  const [showInPerson, setShowInPerson] =
    useState(false);

  const green = "#176b58";
  const dark = "#193d36";

  return (
    <main
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "35px 22px 90px",
        fontFamily: "Arial, sans-serif",
        color: dark,
      }}
    >
      <button
        type="button"
        onClick={() => router.back()}
        style={{
          background: "transparent",
          border: "none",
          color: green,
          fontSize: 18,
          fontWeight: 700,
          cursor: "pointer",
          padding: 0,
        }}
      >
        ← Back
      </button>

      <p
        style={{
          marginTop: 60,
          fontSize: 15,
          fontWeight: 700,
          letterSpacing: 3,
          color: green,
        }}
      >
        CONFIRMATORY HIV TESTING
      </p>

      <h1
        style={{
          fontFamily: "Georgia, serif",
          fontSize: "clamp(38px, 8vw, 65px)",
          lineHeight: 1.12,
          marginBottom: 28,
        }}
      >
        Your next step
      </h1>

      <div
        style={{
          background: "#e8f7f2",
          borderLeft: `6px solid ${green}`,
          padding: 24,
          borderRadius: 12,
          marginBottom: 30,
        }}
      >
        <h2
          style={{
            fontSize: 23,
            lineHeight: 1.4,
            margin: 0,
          }}
        >
          Your reactive self-test requires
          confirmatory HIV testing.
        </h2>

        <p
          style={{
            fontSize: 17,
            lineHeight: 1.6,
          }}
        >
          A reactive self-test does not
          confirm an HIV diagnosis.
          Please arrange confirmatory
          testing promptly.
        </p>
      </div>

      {!showInPerson ? (
        <>
          <h2 style={{ fontSize: 25 }}>
            How would you like to proceed?
          </h2>

          <p
            style={{
              color: "#52645f",
              fontSize: 18,
              lineHeight: 1.6,
            }}
          >
            Select your preferred
            consultation pathway.
          </p>

          <div
            style={{
              display: "grid",
              gap: 18,
              marginTop: 30,
            }}
          >
            <button
              type="button"
              onClick={() =>
                setChoice("virtual_gp")
              }
              aria-pressed={
                choice === "virtual_gp"
              }
              style={{
                padding: 25,
                textAlign: "left",
                borderRadius: 18,
                background:
                  choice === "virtual_gp"
                    ? "#e8f7f2"
                    : "#ffffff",
                border:
                  choice === "virtual_gp"
                    ? `3px solid ${green}`
                    : "2px solid #d7e4df",
                color: dark,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: 23,
                  fontWeight: 700,
                }}
              >
                Virtual GP consultation
              </div>

              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.5,
                }}
              >
                Speak to a GP through
                CareScriber for clinical
                assessment and arrangements
                for confirmatory HIV testing.
              </p>
            </button>

            <button
              type="button"
              onClick={() =>
                setChoice("in_person")
              }
              aria-pressed={
                choice === "in_person"
              }
              style={{
                padding: 25,
                textAlign: "left",
                borderRadius: 18,
                background:
                  choice === "in_person"
                    ? "#e8f7f2"
                    : "#ffffff",
                border:
                  choice === "in_person"
                    ? `3px solid ${green}`
                    : "2px solid #d7e4df",
                color: dark,
                cursor: "pointer",
              }}
            >
              <div
                style={{
                  fontSize: 23,
                  fontWeight: 700,
                }}
              >
                In-person confirmatory testing
              </div>

              <p
                style={{
                  fontSize: 17,
                  lineHeight: 1.5,
                }}
              >
                Visit a healthcare facility
                or qualified HIV testing
                provider for confirmatory
                testing.
              </p>
            </button>
          </div>

          <button
            type="button"
            onClick={handleContinue}
            disabled={!choice || loading}
            style={{
              marginTop: 35,
              background:
                !choice || loading
                  ? "#9aafa8"
                  : green,
              color: "white",
              padding: "19px 38px",
              borderRadius: 50,
              border: "none",
              fontSize: 20,
              fontWeight: 700,
              cursor:
                !choice || loading
                  ? "not-allowed"
                  : "pointer",
            }}
          >
            {loading
              ? "Please wait..."
              : "Continue"}
          </button>
        </>
      ) : (
        <section
          style={{
            border: "2px solid #d7e4df",
            borderRadius: 18,
            padding: 25,
          }}
        >
          <h2>
            Arrange in-person testing
          </h2>

          <p
            style={{
              fontSize: 18,
              lineHeight: 1.6,
            }}
          >
            Contact your nearest clinic
            or qualified HIV testing
            provider. Explain that you
            received a reactive HIV
            self-test result and require
            confirmatory testing.
          </p>

          <p
            style={{
              fontSize: 17,
              lineHeight: 1.6,
            }}
          >
            Confirm that the facility
            offers confirmatory HIV
            testing before travelling.
          </p>

          <button
            type="button"
            onClick={() =>
              setShowInPerson(false)
            }
            style={{
              background: green,
              color: "white",
              padding: "16px 25px",
              borderRadius: 40,
              border: "none",
              fontSize: 17,
              cursor: "pointer",
            }}
          >
            Change selection
          </button>
        </section>
      )}

      <p
        style={{
          marginTop: 55,
          color: "#64736f",
          fontSize: 16,
          lineHeight: 1.6,
        }}
      >
        HIVClinTest provides educational
        support and does not replace
        assessment or testing by a
        qualified healthcare professional.
      </p>
    </main>
  );
}
