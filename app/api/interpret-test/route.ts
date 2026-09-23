"use client";

import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type InterpretationResult =
  | "non_reactive"
  | "reactive"
  | "invalid"
  | "uncertain";

type Confidence = "high" | "medium" | "low";

type InterpretationResponse = {
  result: InterpretationResult;
  confidence: Confidence;
  reason: string;
  test_type?: string;
  retake_photo?: boolean;
  error?: string;
};

export default function TestPhotoPage() {
  const router = useRouter();

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  const [selectedTest, setSelectedTest] = useState<
    "mylan_atomo" | "oraquick"
  >("mylan_atomo");

  const [imagePreview, setImagePreview] = useState("");
  const [imageData, setImageData] = useState("");

  const [loading, setLoading] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState(false);

  const [error, setError] = useState("");
  const [result, setResult] =
    useState<InterpretationResponse | null>(null);

  // -------------------------------------------------------
  // OPEN CAMERA / PHOTO PICKER
  // -------------------------------------------------------

  function openCamera() {
    setError("");
    setResult(null);

    if (!fileInputRef.current) return;

    // Important on mobile:
    // clear the previous file so selecting / taking the
    // same image again still triggers onChange.
    fileInputRef.current.value = "";

    fileInputRef.current.click();
  }

  // -------------------------------------------------------
  // CHOOSE DIFFERENT PHOTO
  // -------------------------------------------------------

  function chooseDifferentPhoto() {
    setError("");
    setResult(null);
    setImagePreview("");
    setImageData("");

    if (!fileInputRef.current) return;

    fileInputRef.current.value = "";

    // Small delay improves reliability on some mobile browsers.
    setTimeout(() => {
      fileInputRef.current?.click();
    }, 100);
  }

  // -------------------------------------------------------
  // FILE SELECTED
  // -------------------------------------------------------

  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setResult(null);
    setProcessingPhoto(true);

    try {
      if (!file.type.startsWith("image/")) {
        throw new Error(
          "Please select or take a photo."
        );
      }

      /*
       * Mobile camera images can easily be 5–15 MB.
       *
       * We resize/compress before sending the image
       * to the API.
       */

      const compressedImage =
        await compressImage(file);

      setImageData(compressedImage);
      setImagePreview(compressedImage);
    } catch (err) {
      console.error(
        "Photo processing error:",
        err
      );

      setImageData("");
      setImagePreview("");

      setError(
        err instanceof Error
          ? err.message
          : "We could not process this photo. Please take another photo."
      );
    } finally {
      setProcessingPhoto(false);
    }
  }

  // -------------------------------------------------------
  // COMPRESS MOBILE IMAGE
  // -------------------------------------------------------

  async function compressImage(
    file: File
  ): Promise<string> {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onerror = () => {
        reject(
          new Error(
            "Unable to read the photo. Please try again."
          )
        );
      };

      reader.onload = () => {
        if (
          !reader.result ||
          typeof reader.result !== "string"
        ) {
          reject(
            new Error(
              "Unable to read the photo."
            )
          );
          return;
        }

        const img = new Image();

        img.onerror = () => {
          reject(
            new Error(
              "Unable to process this image. Please take another photo."
            )
          );
        };

        img.onload = () => {
          try {
            /*
             * 1600px is more than enough for the
             * HIV test result window while keeping
             * mobile uploads manageable.
             */

            const MAX_SIZE = 1600;

            let width = img.naturalWidth;
            let height = img.naturalHeight;

            if (!width || !height) {
              reject(
                new Error(
                  "The selected photo could not be read."
                )
              );
              return;
            }

            if (
              width > MAX_SIZE ||
              height > MAX_SIZE
            ) {
              const scale = Math.min(
                MAX_SIZE / width,
                MAX_SIZE / height
              );

              width = Math.round(
                width * scale
              );

              height = Math.round(
                height * scale
              );
            }

            const canvas =
              document.createElement("canvas");

            canvas.width = width;
            canvas.height = height;

            const ctx =
              canvas.getContext("2d");

            if (!ctx) {
              reject(
                new Error(
                  "Your browser could not process the photo."
                )
              );
              return;
            }

            // White background prevents transparent
            // areas becoming black.
            ctx.fillStyle = "#ffffff";
            ctx.fillRect(
              0,
              0,
              width,
              height
            );

            ctx.drawImage(
              img,
              0,
              0,
              width,
              height
            );

            /*
             * JPEG substantially reduces mobile
             * camera upload size.
             */

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

        img.src = reader.result;
      };

      reader.readAsDataURL(file);
    });
  }

  // -------------------------------------------------------
  // INTERPRET TEST
  // -------------------------------------------------------

  async function interpretTest() {
    if (!imageData) {
      setError(
        "Please take or select a photo of your HIV self-test first."
      );
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const response = await fetch(
        "/api/interpret-test",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",
          },

          body: JSON.stringify({
            image: imageData,
            selected_test: selectedTest,
          }),
        }
      );

      let data: InterpretationResponse;

      try {
        data = await response.json();
      } catch {
        throw new Error(
          "The interpretation service returned an invalid response."
        );
      }

      if (!response.ok) {
        console.error(
          "Interpretation API error:",
          response.status,
          data
        );

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

      setResult(data);

      // ---------------------------------------------------
      // UNCERTAIN
      // ---------------------------------------------------

      if (
        data.result === "uncertain" ||
        data.retake_photo
      ) {
        setError(
          data.reason ||
            "The test is not clearly visible. Please take another photo."
        );

        return;
      }

      // ---------------------------------------------------
      // SAVE RESULT
      // ---------------------------------------------------

      try {
        sessionStorage.setItem(
          "hivclintest_interpretation",
          JSON.stringify({
            ...data,
            selected_test: selectedTest,
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

      // ---------------------------------------------------
      // ROUTING
      // ---------------------------------------------------

      if (
        data.result === "non_reactive"
      ) {
        router.push(
          "/result/non-reactive"
        );

        return;
      }

      if (data.result === "reactive") {
        router.push(
          "/result/reactive"
        );

        return;
      }

      if (data.result === "invalid") {
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
        "Interpret test error:",
        err
      );

      setError(
        err instanceof Error
          ? err.message
          : "Failed to interpret test. Please try again."
      );
    } finally {
      setLoading(false);
    }
  }

  // -------------------------------------------------------
  // PAGE
  // -------------------------------------------------------

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
      {/* HEADER */}

      <header
        style={{
          maxWidth: "760px",
          margin: "0 auto",
          padding: "24px 20px",
          display: "flex",
          alignItems: "center",
          justifyContent:
            "space-between",
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
            fontSize: "13px",
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
        {/* HEADING */}

        <div
          style={{
            marginBottom: "30px",
          }}
        >
          <p
            style={{
              textTransform:
                "uppercase",
              fontSize: "13px",
              fontWeight: 800,
              letterSpacing: "1px",
              marginBottom: "8px",
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
            completed HIV self-test so the
            result window can be visually
            interpreted.
          </p>
        </div>

        {/* TEST TYPE */}

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #d7e4dd",
            borderRadius: "24px",
            padding: "24px",
            marginBottom: "22px",
          }}
        >
          <label
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
            value={selectedTest}
            onChange={(event) =>
              setSelectedTest(
                event.target.value as
                  | "mylan_atomo"
                  | "oraquick"
              )
            }
            style={{
              width: "100%",
              padding: "16px",
              borderRadius: "12px",
              border:
                "1px solid #b9ccc3",
              fontSize: "16px",
              background: "#ffffff",
              color: "#17352d",
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
            marginBottom: "22px",
            textAlign: "center",
          }}
        >
          {/* Hidden mobile camera input */}

          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            capture="environment"
            onChange={
              handlePhotoChange
            }
            style={{
              display: "none",
            }}
          />

          {!imagePreview ? (
            <>
              <div
                style={{
                  fontSize: "52px",
                  marginBottom: "14px",
                }}
              >
                📷
              </div>

              <h2
                style={{
                  margin:
                    "0 0 10px",
                }}
              >
                Take a photo of your test
              </h2>

              <p
                style={{
                  color: "#687a73",
                  lineHeight: 1.6,
                }}
              >
                Make sure the entire result
                window is clearly visible.
              </p>

              <button
                type="button"
                onClick={openCamera}
                disabled={
                  processingPhoto
                }
                style={{
                  width: "100%",
                  border: "none",
                  borderRadius: "50px",
                  padding: "18px",
                  marginTop: "12px",
                  background:
                    "#0b654f",
                  color: "#ffffff",
                  fontWeight: 800,
                  fontSize: "18px",
                  cursor: "pointer",
                }}
              >
                {processingPhoto
                  ? "Processing photo..."
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
                  background:
                    "#f6faf7",
                }}
              />

              <button
                type="button"
                onClick={
                  chooseDifferentPhoto
                }
                disabled={
                  processingPhoto ||
                  loading
                }
                style={{
                  marginTop: "22px",
                  border:
                    "1px solid #bfd2c9",
                  borderRadius: "50px",
                  background: "#ffffff",
                  color: "#0b654f",
                  padding:
                    "15px 26px",
                  fontWeight: 800,
                  fontSize: "17px",
                  cursor: "pointer",
                }}
              >
                Choose Different Photo
              </button>
            </>
          )}
        </div>

        {/* PHOTO GUIDANCE */}

        <div
          style={{
            background: "#ffffff",
            border:
              "1px solid #d7e4dd",
            borderRadius: "24px",
            padding: "26px",
            marginBottom: "22px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              fontSize: "22px",
            }}
          >
            For the best result:
          </h2>

          <ul
            style={{
              color: "#687a73",
              lineHeight: 1.7,
              fontSize: "17px",
              paddingLeft: "24px",
            }}
          >
            <li>
              Place the test on a flat
              surface
            </li>

            <li>Use good lighting</li>

            <li>
              Make sure the entire result
              window is visible
            </li>

            <li>
              Avoid glare and shadows
            </li>

            <li>
              Make sure the test was read
              within the manufacturer's
              specified interpretation time
            </li>
          </ul>
        </div>

        {/* ERROR / RETAKE MESSAGE */}

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
                marginTop: "6px",
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
                  marginTop: "14px",
                  border:
                    "1px solid #923636",
                  background:
                    "#ffffff",
                  color: "#923636",
                  padding:
                    "11px 18px",
                  borderRadius: "30px",
                  fontWeight: 700,
                  cursor: "pointer",
                }}
              >
                Retake Photo
              </button>
            )}
          </div>
        )}

        {/* INTERPRET BUTTON */}

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
            cursor:
              !imageData ||
              loading ||
              processingPhoto
                ? "not-allowed"
                : "pointer",
          }}
        >
          {loading
            ? "Interpreting Test..."
            : processingPhoto
              ? "Processing Photo..."
              : "Interpret My Test"}
        </button>

        {loading && (
          <p
            style={{
              textAlign: "center",
              color: "#687a73",
              marginTop: "14px",
            }}
          >
            Analysing the test image. Please
            don't close this page.
          </p>
        )}

        {/* DISCLAIMER */}

        <p
          style={{
            marginTop: "30px",
            color: "#687a73",
            lineHeight: 1.7,
            fontSize: "15px",
          }}
        >
          This is a screening support
          service. A reactive self-test
          result is not a confirmed HIV
          diagnosis and will require
          confirmatory testing.
        </p>
      </section>
    </main>
  );
}
