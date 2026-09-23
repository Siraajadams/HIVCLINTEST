"use client";

import Link from "next/link";
import {
  ChangeEvent,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";

type TestType =
  | "mylan_atomo"
  | "oraquick";

type InterpretationResult =
  | "non_reactive"
  | "reactive"
  | "invalid"
  | "uncertain";

type InterpretationResponse = {
  result?: InterpretationResult;
  confidence?: "high" | "medium" | "low";
  reason?: string;
  test_type?: string;
  test_detected?: boolean;
  retake_photo?: boolean;
  error?: string;
};

export default function TestPhotoPage() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(null);

  const [selectedTest, setSelectedTest] =
    useState<TestType>("mylan_atomo");

  const [imagePreview, setImagePreview] =
    useState("");

  const [imageData, setImageData] =
    useState("");

  const [loading, setLoading] =
    useState(false);

  const [
    processingPhoto,
    setProcessingPhoto,
  ] = useState(false);

  const [error, setError] =
    useState("");

  // =====================================================
  // OPEN CAMERA
  // =====================================================

  function openCamera() {
    if (loading || processingPhoto) {
      return;
    }

    setError("");

    const input = fileInputRef.current;

    if (!input) {
      setError(
        "The camera could not be opened. Please try again."
      );
      return;
    }

    input.value = "";
    input.click();
  }

  // =====================================================
  // RETAKE PHOTO
  // =====================================================

  function chooseDifferentPhoto() {
    if (loading || processingPhoto) {
      return;
    }

    setError("");
    setImagePreview("");
    setImageData("");

    const input = fileInputRef.current;

    if (!input) {
      return;
    }

    input.value = "";

    window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  }

  // =====================================================
  // HANDLE PHOTO
  // =====================================================

  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setProcessingPhoto(true);

    try {
      if (
        !file.type ||
        !file.type.startsWith("image/")
      ) {
        throw new Error(
          "Please take or select an image."
        );
      }

      const prepared =
        await prepareImage(file);

      setImagePreview(prepared);
      setImageData(prepared);
    } catch (err) {
      console.error(
        "Photo processing error:",
        err
      );

      setImagePreview("");
      setImageData("");

      setError(
        err instanceof Error
          ? err.message
          : "The photo could not be processed."
      );
    } finally {
      setProcessingPhoto(false);
    }
  }

  // =====================================================
  // PREPARE IMAGE
  // =====================================================

  async function prepareImage(
    file: File
  ): Promise<string> {
    const dataUrl =
      await readFileAsDataURL(file);

    return new Promise(
      (resolve, reject) => {
        const image = new Image();

        image.onload = () => {
          try {
            const sourceWidth =
              image.naturalWidth;

            const sourceHeight =
              image.naturalHeight;

            if (
              !sourceWidth ||
              !sourceHeight
            ) {
              reject(
                new Error(
                  "The photo could not be read."
                )
              );
              return;
            }

            const MAX_DIMENSION = 1600;

            let width = sourceWidth;
            let height = sourceHeight;

            if (
              width > MAX_DIMENSION ||
              height > MAX_DIMENSION
            ) {
              const scale = Math.min(
                MAX_DIMENSION / width,
                MAX_DIMENSION / height
              );

              width = Math.round(
                width * scale
              );

              height = Math.round(
                height * scale
              );
            }

            const canvas =
              document.createElement(
                "canvas"
              );

            canvas.width = width;
            canvas.height = height;

            const context =
              canvas.getContext("2d");

            if (!context) {
              reject(
                new Error(
                  "Your browser could not process this photo."
                )
              );
              return;
            }

            context.fillStyle =
              "#ffffff";

            context.fillRect(
              0,
              0,
              width,
              height
            );

            context.drawImage(
              image,
              0,
              0,
              width,
              height
            );

            const compressed =
              canvas.toDataURL(
                "image/jpeg",
                0.82
              );

            resolve(compressed);
          } catch (err) {
            reject(err);
          }
        };

        image.onerror = () => {
          reject(
            new Error(
              "This photo could not be processed. Please take another photo."
            )
          );
        };

        image.src = dataUrl;
      }
    );
  }

  function readFileAsDataURL(
    file: File
  ): Promise<string> {
    return new Promise(
      (resolve, reject) => {
        const reader =
          new FileReader();

        reader.onload = () => {
          if (
            typeof reader.result ===
            "string"
          ) {
            resolve(reader.result);
          } else {
            reject(
              new Error(
                "The photo could not be read."
              )
            );
          }
        };

        reader.onerror = () => {
          reject(
            new Error(
              "The photo could not be read."
            )
          );
        };

        reader.readAsDataURL(file);
      }
    );
  }

  // =====================================================
  // INTERPRET
  // =====================================================

  async function interpretTest() {
    if (!imageData) {
      setError(
        "Please take or choose a photo of your HIV self-test."
      );
      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");

    try {
      const response =
        await fetch(
          "/api/interpret-test",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json",
            },

            body: JSON.stringify({
              image: imageData,
              selected_test:
                selectedTest,
            }),
          }
        );

      const responseText =
        await response.text();

      let data:
        InterpretationResponse;

      try {
        data =
          JSON.parse(responseText);
      } catch {
        console.error(
          "Unexpected API response:",
          response.status,
          responseText.slice(
            0,
            500
          )
        );

        throw new Error(
          "The interpretation service returned an unexpected response."
        );
      }

      if (!response.ok) {
        throw new Error(
          data.error ||
            "The test could not be interpreted."
        );
      }

      if (!data.result) {
        throw new Error(
          "No interpretation result was returned."
        );
      }

      // ===============================================
      // RETAKE
      // ===============================================

      if (
        data.result ===
          "uncertain" ||
        data.retake_photo === true
      ) {
        setError(
          data.reason ||
            "The test result is not clearly visible. Please take another photo."
        );

        return;
      }

      // ===============================================
      // SAVE RESULT
      // ===============================================

      try {
        window.sessionStorage.setItem(
          "hivclintest_interpretation",
          JSON.stringify({
            ...data,
            selected_test:
              selectedTest,
            interpreted_at:
              new Date().toISOString(),
          })
        );
      } catch (storageError) {
        console.warn(
          "Could not save interpretation:",
          storageError
        );
      }

      // ===============================================
      // ROUTING
      // ===============================================

      if (
        data.result ===
        "non_reactive"
      ) {
        router.push(
          "/result/non-reactive"
        );
        return;
      }

      if (
        data.result ===
        "reactive"
      ) {
        router.push(
          "/result/reactive"
        );
        return;
      }

      if (
        data.result ===
        "invalid"
      ) {
        router.push(
          "/result/invalid"
        );
        return;
      }

      setError(
        "The test could not be interpreted confidently. Please take another photo."
      );
    } catch (err) {
      console.error(
        "Interpretation error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to interpret the test. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // =====================================================
  // UI
  // =====================================================

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#f6faf7",
        color: "#17352d",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        paddingBottom: "70px",
      }}
    >
      <header
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "24px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
          gap: "15px",
        }}
      >
        <Link
          href="/"
          style={{
            color: "#17352d",
            textDecoration: "none",
            fontWeight: 800,
            fontSize: "21px",
          }}
        >
          <span
            style={{
              color: "#39ff14",
              marginRight: "7px",
            }}
          >
            +
          </span>

          HIVClinTest
        </Link>

        <span
          style={{
            fontSize: "12px",
            color: "#687a73",
          }}
        >
          Private and confidential
        </span>
      </header>

      <section
        style={{
          width: "calc(100% - 32px)",
          maxWidth: "650px",
          margin: "0 auto",
        }}
      >
        <p
          style={{
            textTransform:
              "uppercase",
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "1px",
          }}
        >
          HIV self-test
        </p>

        <h1
          style={{
            fontSize:
              "clamp(30px, 7vw, 44px)",
            margin: "0 0 12px",
          }}
        >
          Interpret your test
        </h1>

        <p
          style={{
            color: "#687a73",
            lineHeight: 1.6,
            fontSize: "17px",
          }}
        >
          Take a clear photo of the
          completed HIV self-test. Make
          sure the entire test and result
          window are visible.
        </p>

        {/* TEST TYPE */}

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #d7e4dd",
            borderRadius: "24px",
            padding: "24px",
            marginTop: "25px",
            marginBottom: "22px",
          }}
        >
          <label
            htmlFor="test-type"
            style={{
              display: "block",
              fontWeight: 800,
              marginBottom: "10px",
            }}
          >
            Which HIV self-test are you
            using?
          </label>

          <select
            id="test-type"
            value={selectedTest}
            onChange={(event) =>
              setSelectedTest(
                event.target
                  .value as TestType
              )
            }
            style={{
              width: "100%",
              boxSizing:
                "border-box",
              padding: "16px",
              borderRadius: "12px",
              border:
                "1px solid #b9ccc3",
              background: "#ffffff",
              color: "#17352d",
              fontSize: "16px",
            }}
          >
            <option value="mylan_atomo">
              Mylan / Atomo HIV Self Test
            </option>

            <option value="oraquick">
              OraQuick HIV Self Test
            </option>
          </select>
        </div>

        {/* PHOTO */}

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #d7e4dd",
            borderRadius: "24px",
            padding: "24px",
            textAlign: "center",
            marginBottom: "22px",
          }}
        >
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={
              handlePhotoChange
            }
            style={{
              position: "absolute",
              width: "1px",
              height: "1px",
              opacity: 0,
              overflow: "hidden",
            }}
          />

          {!imagePreview ? (
            <>
              <div
                style={{
                  fontSize: "50px",
                }}
              >
                📷
              </div>

              <h2>
                Take a photo of your test
              </h2>

              <p
                style={{
                  color: "#687a73",
                  lineHeight: 1.6,
                }}
              >
                Use your phone camera to
                photograph the completed
                test.
              </p>

              <button
                type="button"
                onClick={openCamera}
                disabled={
                  loading ||
                  processingPhoto
                }
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "50px",
                  padding: "18px",
                  background:
                    "#0b654f",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "18px",
                }}
              >
                {processingPhoto
                  ? "Processing Photo..."
                  : "Take or Choose Photo"}
              </button>
            </>
          ) : (
            <>
              <img
                src={imagePreview}
                alt="Selected HIV self-test"
                style={{
                  display: "block",
                  width: "100%",
                  maxHeight: "520px",
                  objectFit: "contain",
                  borderRadius: "18px",
                }}
              />

              <button
                type="button"
                onClick={
                  chooseDifferentPhoto
                }
                disabled={
                  loading ||
                  processingPhoto
                }
                style={{
                  marginTop: "20px",
                  padding:
                    "14px 24px",
                  borderRadius: "50px",
                  border:
                    "1px solid #bfd2c9",
                  background:
                    "#ffffff",
                  color: "#0b654f",
                  fontWeight: 800,
                  fontSize: "16px",
                }}
              >
                Choose Different Photo
              </button>
            </>
          )}
        </div>

        {/* ERROR */}

        {error && (
          <div
            role="alert"
            style={{
              background: "#fff0f0",
              border:
                "1px solid #f1cccc",
              color: "#923636",
              padding: "18px",
              borderRadius: "16px",
              marginBottom: "20px",
              lineHeight: 1.5,
            }}
          >
            <strong>
              We couldn't interpret this
              photo
            </strong>

            <div
              style={{
                marginTop: "7px",
              }}
            >
              {error}
            </div>

            {imagePreview && (
              <button
                type="button"
                onClick={
                  chooseDifferentPhoto
                }
                style={{
                  marginTop: "15px",
                  border:
                    "1px solid #923636",
                  background:
                    "#ffffff",
                  color: "#923636",
                  padding:
                    "12px 18px",
                  borderRadius: "30px",
                  fontWeight: 800,
                }}
              >
                Retake Photo
              </button>
            )}
          </div>
        )}

        {/* INTERPRET */}

        <button
          type="button"
          onClick={interpretTest}
          disabled={
            !imageData ||
            loading ||
            processingPhoto
          }
          style={{
            width: "100%",
            border: "none",
            borderRadius: "50px",
            padding: "20px",
            background:
              !imageData ||
              loading ||
              processingPhoto
                ? "#a7bcb4"
                : "#0b654f",
            color: "#ffffff",
            fontSize: "20px",
            fontWeight: 800,
          }}
        >
          {loading
            ? "Interpreting Test..."
            : processingPhoto
              ? "Processing Photo..."
              : "Interpret My Test"}
        </button>

        {loading && (
          <div
            style={{
              marginTop: "18px",
              textAlign: "center",
              padding: "16px",
              borderRadius: "14px",
              background: "#efffeb",
              color: "#47655b",
            }}
          >
            <strong>
              Analysing your test image...
            </strong>

            <div
              style={{
                marginTop: "6px",
                fontSize: "14px",
              }}
            >
              Please keep this page open.
            </div>
          </div>
        )}

        <p
          style={{
            marginTop: "30px",
            color: "#687a73",
            lineHeight: 1.7,
            fontSize: "15px",
          }}
        >
          This tool visually interprets a
          self-test and does not diagnose
          HIV. A reactive self-test result
          requires confirmatory testing.
        </p>
      </section>
    </main>
  );
}
