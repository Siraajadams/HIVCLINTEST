import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestType = "mylan_atomo" | "oraquick";

type TestResult =
  | "non_reactive"
  | "reactive"
  | "invalid"
  | "uncertain";

type Confidence = "high" | "medium" | "low";

interface InterpretationRequest {
  image: string;
  selected_test: TestType;
}

interface AIInterpretation {
  result?: unknown;
  confidence?: unknown;
  reason?: unknown;
  test_detected?: unknown;
  result_window_visible?: unknown;
  control_line_visible?: unknown;
  test_line_visible?: unknown;
  retake_photo?: unknown;
}

interface InterpretationResponse {
  result: TestResult;
  confidence: Confidence;
  reason: string;
  test_type: string;

  test_detected: boolean;
  result_window_visible: boolean;

  control_line_visible: boolean | null;
  test_line_visible: boolean | null;

  retake_photo: boolean;
}

const MAX_IMAGE_BYTES =
  8 * 1024 * 1024;

const IMAGE_REGEX =
  /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;

// ======================================================
// VALIDATION
// ======================================================

function isValidResult(
  value: unknown
): value is TestResult {
  return (
    value === "non_reactive" ||
    value === "reactive" ||
    value === "invalid" ||
    value === "uncertain"
  );
}

function isValidConfidence(
  value: unknown
): value is Confidence {
  return (
    value === "high" ||
    value === "medium" ||
    value === "low"
  );
}

function booleanOrNull(
  value: unknown
): boolean | null {
  if (value === true) {
    return true;
  }

  if (value === false) {
    return false;
  }

  return null;
}

// ======================================================
// POST
// ======================================================

export async function POST(
  request: NextRequest
) {
  try {
    // ==================================================
    // 1. READ REQUEST
    // ==================================================

    let body: InterpretationRequest;

    try {
      body =
        await request.json();
    } catch {
      return NextResponse.json(
        {
          error:
            "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const image =
      body?.image;

    const selectedTest =
      body?.selected_test;

    // ==================================================
    // 2. VALIDATE REQUEST
    // ==================================================

    if (!image) {
      return NextResponse.json(
        {
          error:
            "No test image was provided.",
        },
        {
          status: 400,
        }
      );
    }

    if (!selectedTest) {
      return NextResponse.json(
        {
          error:
            "No HIV self-test type was selected.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      selectedTest !==
        "mylan_atomo" &&
      selectedTest !==
        "oraquick"
    ) {
      return NextResponse.json(
        {
          error:
            "Invalid HIV self-test type.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // 3. VALIDATE IMAGE
    // ==================================================

    const imageMatch =
      image.match(
        IMAGE_REGEX
      );

    if (!imageMatch) {
      return NextResponse.json(
        {
          error:
            "The photo format is not supported. Please take another photo.",
        },
        {
          status: 400,
        }
      );
    }

    try {
      const base64Data =
        imageMatch[2].replace(
          /\s/g,
          ""
        );

      const imageBytes =
        Buffer.from(
          base64Data,
          "base64"
        ).byteLength;

      if (
        imageBytes >
        MAX_IMAGE_BYTES
      ) {
        return NextResponse.json(
          {
            error:
              "The photo is too large. Please take another photo.",
          },
          {
            status: 413,
          }
        );
      }
    } catch {
      return NextResponse.json(
        {
          error:
            "The test photo could not be processed.",
        },
        {
          status: 400,
        }
      );
    }

    // ==================================================
    // 4. OPENAI
    // ==================================================

    const apiKey =
      process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      console.error(
        "OPENAI_API_KEY is not configured."
      );

      return NextResponse.json(
        {
          error:
            "The test interpretation service is temporarily unavailable.",
        },
        {
          status: 500,
        }
      );
    }

    // ==================================================
    // 5. TEST LABEL
    // ==================================================

    const testTypeLabel =
      selectedTest ===
      "mylan_atomo"
        ? "Mylan / Atomo HIV Self Test"
        : "OraQuick HIV Self-Test";

    // ==================================================
    // 6. SYSTEM PROMPT
    // ==================================================

    const systemPrompt = `
You are the visual interpretation component of HIVClinTest.

Your task is ONLY to inspect the visible result window of an HIV self-test.

You are NOT diagnosing HIV.

The user has selected this test:

${testTypeLabel}

==================================================
PRIMARY RULE
==================================================

The ENTIRE physical test device does NOT need to be visible.

A close-up photograph of the RESULT WINDOW is acceptable and is often preferred.

Do NOT reject an image simply because:

- the outer test casing is cropped
- only the result-window portion is visible
- the photograph is a close-up
- part of the surrounding plastic is outside the photograph
- branding is not visible
- packaging is not visible

The important question is:

CAN THE RESULT WINDOW AND THE RELEVANT CONTROL / TEST INDICATORS BE SEEN CLEARLY ENOUGH TO INTERPRET?

==================================================
FIRST: IDENTIFY THE RESULT WINDOW
==================================================
