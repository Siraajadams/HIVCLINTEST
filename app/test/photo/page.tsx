"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";

export default function PhotoPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [image, setImage] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string>("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string>("");

  const selectedTest = typeof window !== "undefined" ? sessionStorage.getItem("selected_test") : null;
  const testLabel =
    selectedTest === "mylan_atomo"
      ? "Mylan / Atomo – Blood"
      : selectedTest === "oraquick"
        ? "OraQuick – Oral Fluid"
        : "Unknown test";

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError("");

    // Validate file type
    if (!file.type.startsWith("image/")) {
      setError("Please select a valid image file");
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError("Image size must be less than 5MB");
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setImage(result);
      setFileName(file.name);
    };
    reader.readAsDataURL(file);
  };

  const handleInterpret = async () => {
    if (!image) return;

    setIsLoading(true);
    setError("");

    try {
      const response = await fetch("/api/interpret-test", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          image,
          selected_test: selectedTest,
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to interpret test");
      }

      const result = await response.json();

      // Store the interpretation result in sessionStorage
      sessionStorage.setItem("ai_interpretation", JSON.stringify(result));
      sessionStorage.setItem("test_image", image);

      // Navigate to review page
      router.push("/test/photo/review");
    } catch (err) {
      setError(err instanceof Error ? err.message : "An error occurred while interpreting the test");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">+</span> HIVClinTest
        </Link>
        <div className="confidential">Private and confidential</div>
      </header>

      <section className="flow-shell photo-shell" aria-labelledby="photo-title">
        <Link className="back-link" href="/test">
          Back
        </Link>

        <div className="flow-heading">
          <p className="eyebrow">Step 3 of 4</p>
          <h1 id="photo-title">Upload Your HIV Self-Test</h1>
          <p className="flow-subtitle">Take a clear photo of your completed HIV self-test or upload an existing photo.</p>
        </div>

        <div className="test-info-banner">
          <p>
            <strong>Test type:</strong> {testLabel}
          </p>
        </div>

        <div className="photo-upload-section">
          {!image ? (
            <div className="upload-options">
              <div className="upload-buttons">
                <button
                  className="upload-button primary"
                  onClick={() => {
                    fileInputRef.current?.click();
                  }}
                  type="button"
                >
                  Take Photo or Upload
                </button>
              </div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleFileSelect}
                style={{ display: "none" }}
                aria-label="Upload test image"
              />
            </div>
          ) : (
            <div className="image-preview-section">
              <div className="image-preview">
                <img src={image} alt="Uploaded test" />
              </div>
              <button
                className="upload-button secondary"
                onClick={() => {
                  fileInputRef.current?.click();
                }}
                type="button"
              >
                Choose Different Photo
              </button>
            </div>
          )}

          <div className="instructions-card">
            <h2>For the best result:</h2>
            <ul className="instructions-list">
              <li>Place the test on a flat surface</li>
              <li>Use good lighting</li>
              <li>Make sure the entire result window is visible</li>
              <li>Avoid glare and shadows</li>
              <li>Make sure the test was read within the manufacturer&apos;s specified interpretation time</li>
            </ul>
          </div>

          {error && <div className="error-message">{error}</div>}

          <button
            className="start-button continue-button"
            type="button"
            disabled={!image || isLoading}
            onClick={handleInterpret}
          >
            {isLoading ? "Interpreting..." : "Interpret My Test"}
          </button>
        </div>

        <p className="screening-note">This is a screening support service. A reactive self-test result is not a confirmed HIV diagnosis and will require confirmatory testing.</p>
      </section>
    </main>
  );
}
