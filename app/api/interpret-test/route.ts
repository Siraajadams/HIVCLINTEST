"use client";

import Link from "next/link";
import { ChangeEvent, useRef, useState } from "react";
import { useRouter } from "next/navigation";

type TestType = "mylan_atomo" | "oraquick";

type InterpretationResult =
  | "non_reactive"
  | "reactive"
  | "invalid"
  | "uncertain";

type Confidence =
  | "high"
  | "medium"
  | "low";

type InterpretationResponse = {
  result?: InterpretationResult;
  confidence?: Confidence;
  reason?: string;
  test_type?: string;
  test_detected?: boolean;
  retake_photo?: boolean;
  error?: string;
};

export default function TestPhotoPage() {
  const router = useRouter();

  const fileInputRef =
    useRef<HTMLInputElement | null>(
      null
    );

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

  const [
    result,
    setResult,
  ] =
    useState<InterpretationResponse | null>(
      null
    );

  // =====================================================
  // OPEN CAMERA / PHOTO LIBRARY
  // =====================================================

  function openCamera() {
    if (
      loading ||
      processingPhoto
    ) {
      return;
    }

    setError("");
    setResult(null);

    const input =
      fileInputRef.current;

    if (!input) {
      setError(
        "The camera could not be opened. Please try again."
      );
      return;
    }

    /*
     * Important for iPhone + Android:
     *
     * Reset the value so choosing the same
     * photo twice still triggers onChange.
     */
    input.value = "";

    input.click();
  }

  // =====================================================
  // RETAKE / CHOOSE DIFFERENT PHOTO
  // =====================================================

  function chooseDifferentPhoto() {
    if (
      loading ||
      processingPhoto
    ) {
      return;
    }

    setError("");
    setResult(null);

    setImagePreview("");
    setImageData("");

    const input =
      fileInputRef.current;

    if (!input) {
      return;
    }

    /*
     * Reset the native file input.
     */
    input.value = "";

    /*
     * Give mobile Safari / Chrome a moment
     * after resetting the input.
     */
    window.setTimeout(() => {
      fileInputRef.current?.click();
    }, 50);
  }

  // =====================================================
  // PHOTO SELECTED
  // =====================================================

  async function handlePhotoChange(
    event: ChangeEvent<HTMLInputElement>
  ) {
    const file =
      event.target.files?.[0];

    if (!file) {
      return;
    }

    setError("");
    setResult(null);
    setProcessingPhoto(true);

    try {
      if (
        !file.type ||
        !file.type.startsWith("image/")
      ) {
        throw new Error(
          "Please select an image or take a photo."
        );
      }

      /*
       * Mobile camera photos can be large.
       *
       * Compress them before sending them
       * to our API.
       */
      const compressedImage =
        await prepareImage(file);

      setImagePreview(
        compressedImage
      );

      setImageData(
        compressedImage
      );
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
          : "We could not process this photo. Please try again."
      );
    } finally {
      setProcessingPhoto(false);
    }
  }

  // =====================================================
  // PREPARE / COMPRESS IMAGE
  // =====================================================

  async function prepareImage(
    file: File
  ): Promise<string> {
    const originalDataUrl =
      await readFileAsDataURL(file);

    /*
     * Try browser-native image decoding first.
     *
     * createImageBitmap works well on modern
     * Android and newer iPhones.
     */
    if (
      typeof createImageBitmap ===
      "function"
    ) {
      try {
        const bitmap =
          await createImageBitmap(file);

        try {
          return resizeToJpeg(
            bitmap,
            bitmap.width,
            bitmap.height
          );
        } finally {
          bitmap.close();
        }
      } catch (bitmapError) {
        console.warn(
          "createImageBitmap unavailable for this image. Falling back to Image.",
          bitmapError
        );
      }
    }

    /*
     * Safari-compatible fallback.
     */
    return new Promise(
      (resolve, reject) => {
        const image =
          new Image();

        image.onload = () => {
          try {
            const width =
              image.naturalWidth;

            const height =
              image.naturalHeight;

            if (
              !width ||
              !height
            ) {
              reject(
                new Error(
                  "The selected photo could not be read."
                )
              );
              return;
            }

            const compressed =
              resizeToJpeg(
                image,
                width,
                height
              );

            resolve(
              compressed
            );
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

        image.src =
          originalDataUrl;
      }
    );
  }

  // =====================================================
  // READ FILE
  // =====================================================

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
            resolve(
              reader.result
            );
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

        reader.readAsDataURL(
          file
        );
      }
    );
  }

  // =====================================================
  // RESIZE TO JPEG
  // =====================================================

  function resizeToJpeg(
    source:
      | HTMLImageElement
      | ImageBitmap,
    sourceWidth: number,
    sourceHeight: number
  ): string {
    /*
     * 1600px provides enough resolution
     * for the test window while keeping
     * uploads manageable on mobile data.
     */
    const MAX_DIMENSION =
      1600;

    let width =
      sourceWidth;

    let height =
      sourceHeight;

    if (
      width >
        MAX_DIMENSION ||
      height >
        MAX_DIMENSION
    ) {
      const scale =
        Math.min(
          MAX_DIMENSION /
            width,
          MAX_DIMENSION /
            height
        );

      width =
        Math.round(
          width * scale
        );

      height =
        Math.round(
          height * scale
        );
    }

    const canvas =
      document.createElement(
        "canvas"
      );

    canvas.width =
      width;

    canvas.height =
      height;

    const context =
      canvas.getContext(
        "2d"
      );

    if (!context) {
      throw new Error(
        "Your browser could not prepare this photo."
      );
    }

    /*
     * White background prevents
     * transparent images becoming black.
     */
    context.fillStyle =
      "#ffffff";

    context.fillRect(
      0,
      0,
      width,
      height
    );

    context.drawImage(
      source,
      0,
      0,
      width,
      height
    );

    /*
     * JPEG keeps mobile payloads
     * substantially smaller.
     */
    return canvas.toDataURL(
      "image/jpeg",
      0.82
    );
  }

  // =====================================================
  // INTERPRET TEST
  // =====================================================

  async function interpretTest() {
    if (!imageData) {
      setError(
        "Please take or choose a photo of your HIV self-test first."
      );

      return;
    }

    if (loading) {
      return;
    }

    setLoading(true);
    setError("");
    setResult(null);

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

            body:
              JSON.stringify({
                image:
                  imageData,

                selected_test:
                  selectedTest,
              }),
          }
        );

      /*
       * Read as text first.
       *
       * This gives us a better error
       * if Vercel returns HTML rather
       * than JSON.
       */
      const responseText =
        await response.text();

      let data:
        InterpretationResponse;

      try {
        data =
          JSON.parse(
            responseText
          );
      } catch {
        console.error(
          "Non-JSON API response:",
          response.status,
          responseText.slice(
            0,
            500
          )
        );

        throw new Error(
          "The interpretation service returned an unexpected response. Please try again."
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

      // =================================================
      // UNCERTAIN / RETAKE
      // =================================================

      if (
        data.result ===
          "uncertain" ||
        data.retake_photo ===
          true
      ) {
        setError(
          data.reason ||
            "The HIV self-test result is not clearly visible. Please retake the photo."
        );

        return;
      }

      // =================================================
      // SAVE INTERPRETATION
      // =================================================

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
      } catch (
        storageError
      ) {
        console.warn(
          "Unable to save interpretation:",
          storageError
        );
      }

      // =================================================
      // ROUTE RESULT
      // =================================================

      switch (
        data.result
      ) {
        case "non_reactive":
          router.push(
            "/result/non-reactive"
          );
          return;

        case "reactive":
          router.push(
            "/result/reactive"
          );
          return;

        case "invalid":
          router.push(
            "/result/invalid"
          );
          return;

        default:
          setError(
            "The HIV self-test could not be interpreted confidently. Please take another photo."
          );
          return;
      }
    } catch (err) {
      console.error(
        "Interpret test error:",
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
  // PAGE
  // =====================================================

  return (
    <main
      style={{
        minHeight:
          "100vh",
        background:
          "#f6faf7",
        color:
          "#17352d",
        fontFamily:
          "Arial, Helvetica, sans-serif",
        paddingBottom:
          "70px",
      }}
    >
      <header
        style={{
          maxWidth:
            "760px",
          margin:
            "0 auto",
          padding:
            "24px 20px",
          display:
            "flex",
          alignItems:
            "center",
          justifyContent:
            "space-between",
          gap: "15px",
        }}
      >
        <Link
          href="/"
          style={{
            color:
              "#17352d",
            textDecoration:
              "none",
            fontWeight:
              800,
            fontSize:
              "21px",
          }}
        >
          <span
            style={{
              color:
                "#39ff14",
              marginRight:
                "7px",
            }}
          >
            +
          </span>

          HIVClinTest
        </Link>

        <span
          style={{
            fontSize:
              "12px",
            color:
              "#687a73",
            textAlign:
              "right",
          }}
        >
          Private and confidential
        </span>
      </header>

      <section
        style={{
          width:
            "calc(100% - 32px)",
          maxWidth:
            "650px",
          margin:
            "0 auto",
        }}
      >
        <div
          style={{
            marginBottom:
              "28px",
          }}
        >
          <p
            style={{
              textTransform:
                "uppercase",
              fontSize:
                "13px",
              fontWeight:
                800,
              letterSpacing:
                "1px",
              marginBottom:
                "8px",
            }}
          >
            HIV self-test
          </p>

          <h1
            style={{
              fontSize:
                "clamp(30px, 7vw, 44px)",
              margin:
                "0 0 12px",
            }}
          >
            Interpret your test
          </h1>

          <p
            style={{
              color:
                "#687a73",
              lineHeight:
                1.6,
              fontSize:
                "17px",
              margin:
                0,
            }}
          >
            Take a clear photo of the
            completed HIV self-test. Make
            sure the test device and entire
            result window are visible.
          </p>
        </div>

        {/* TEST TYPE */}

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #d7e4dd",
            borderRadius:
              "24px",
            padding:
              "24px",
            marginBottom:
              "22px",
          }}
        >
          <label
            htmlFor="test-type"
            style={{
              display:
                "block",
              fontWeight:
                800,
              marginBottom:
                "10px",
              fontSize:
                "17px",
            }}
          >
            Which HIV self-test are you
            using?
          </label>

          <select
            id="test-type"
            value={
              selectedTest
            }
            onChange={(
              event
            ) => {
              setSelectedTest(
                event.target
                  .value as TestType
              );

              setError("");
              setResult(null);
            }}
            disabled={
              loading ||
              processingPhoto
            }
            style={{
              width:
                "100%",
              boxSizing:
                "border-box",
              padding:
                "16px",
              borderRadius:
                "12px",
              border:
                "1px solid #b9ccc3",
              fontSize:
                "16px",
              background:
                "#ffffff",
              color:
                "#17352d",
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

        {/* PHOTO AREA */}

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #d7e4dd",
            borderRadius:
              "24px",
            padding:
              "24px",
            marginBottom:
              "22px",
            textAlign:
              "center",
          }}
        >
          {/*
           * Using accept=image/* gives:
           *
           * Android:
           * camera / gallery options
           *
           * iPhone:
           * Take Photo or Video /
           * Photo Library / Choose File
           *
           * capture=environment asks mobile
           * browsers to prefer the rear camera.
           */}

          <input
            ref={
              fileInputRef
            }
            type="file"
            accept="image/*"
            capture="environment"
            onChange={
              handlePhotoChange
            }
            style={{
              position:
                "absolute",
              width:
                "1px",
              height:
                "1px",
              opacity:
                0,
              overflow:
                "hidden",
              pointerEvents:
                "none",
            }}
          />

          {!imagePreview ? (
            <>
              <div
                style={{
                  fontSize:
                    "50px",
                  marginBottom:
                    "12px",
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
                  color:
                    "#687a73",
                  lineHeight:
                    1.6,
                  marginBottom:
                    "20px",
                }}
              >
                Use your phone camera or
                choose an existing photo.
              </p>

              <button
                type="button"
                onClick={
                  openCamera
                }
                disabled={
                  processingPhoto ||
                  loading
                }
                style={{
                  width:
                    "100%",
                  border:
                    "none",
                  borderRadius:
                    "50px",
                  padding:
                    "18px",
                  background:
                    "#0b654f",
                  color:
                    "#ffffff",
                  fontWeight:
                    800,
                  fontSize:
                    "18px",
                  cursor:
                    "pointer",
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
                src={
                  imagePreview
                }
                alt="Selected HIV self-test"
                style={{
                  display:
                    "block",
                  width:
                    "100%",
                  maxHeight:
                    "520px",
                  objectFit:
                    "contain",
                  borderRadius:
                    "18px",
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
                  marginTop:
                    "22px",
                  border:
                    "1px solid #bfd2c9",
                  borderRadius:
                    "50px",
                  background:
                    "#ffffff",
                  color:
                    "#0b654f",
                  padding:
                    "15px 26px",
                  fontWeight:
                    800,
                  fontSize:
                    "17px",
                  cursor:
                    "pointer",
                }}
              >
                Choose Different Photo
              </button>
            </>
          )}
        </div>

        {/* GUIDANCE */}

        <div
          style={{
            background:
              "#ffffff",
            border:
              "1px solid #d7e4dd",
            borderRadius:
              "24px",
            padding:
              "26px",
            marginBottom:
              "22px",
          }}
        >
          <h2
            style={{
              marginTop:
                0,
              fontSize:
                "22px",
            }}
          >
            For the best result:
          </h2>

          <ul
            style={{
              color:
                "#687a73",
              lineHeight:
                1.7,
              fontSize:
                "17px",
              paddingLeft:
                "24px",
              marginBottom:
                0,
            }}
          >
            <li>
              Place the test on a flat
              surface
            </li>

            <li>
              Use good lighting
            </li>

            <li>
              Make sure the entire result
              window is visible
            </li>

            <li>
              Hold the camera directly
              above the test
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

        {/* ERROR / RETAKE */}

        {error && (
          <div
            role="alert"
            style={{
              background:
                "#fff0f0",
              border:
                "1px solid #f1cccc",
              color:
                "#923636",
              padding:
                "18px",
              borderRadius:
                "16px",
              marginBottom:
                "20px",
              lineHeight:
                1.5,
            }}
          >
            <strong>
              We couldn't interpret this
              photo
            </strong>

            <div
              style={{
                marginTop:
                  "7px",
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
                disabled={
                  loading ||
                  processingPhoto
                }
                style={{
                  marginTop:
                    "15px",
                  border:
                    "1px solid #923636",
                  background:
                    "#ffffff",
                  color:
                    "#923636",
                  padding:
                    "12px 18px",
                  borderRadius:
                    "30px",
                  fontWeight:
                    800,
                  fontSize:
                    "15px",
                  cursor:
                    "pointer",
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
          onClick={
            interpretTest
          }
          disabled={
            !imageData ||
            loading ||
            processingPhoto
          }
          style={{
            width:
              "100%",
            border:
              "none",
            borderRadius:
              "50px",
            padding:
              "20px",
            background:
              !imageData ||
              loading ||
              processingPhoto
                ? "#a7bcb4"
                : "#0b654f",
            color:
              "#ffffff",
            fontSize:
              "20px",
            fontWeight:
              800,
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
          <div
            style={{
              textAlign:
                "center",
              marginTop:
                "18px",
              padding:
                "15px",
              background:
                "#efffeb",
              borderRadius:
                "14px",
              color:
                "#47655b",
              lineHeight:
                1.5,
            }}
          >
            <strong>
              Analysing your test image...
            </strong>

            <div
              style={{
                marginTop:
                  "5px",
                fontSize:
                  "14px",
              }}
            >
              Please keep this page open
              while the image is being
              checked.
            </div>
          </div>
        )}

        {/* DISCLAIMER */}

        <p
          style={{
            marginTop:
              "30px",
            color:
              "#687a73",
            lineHeight:
              1.7,
            fontSize:
              "15px",
          }}
        >
          This is a screening support
          service. A reactive self-test
          result is not a confirmed HIV
          diagnosis and requires
          confirmatory testing.
        </p>
      </section>
    </main>
  );
}
