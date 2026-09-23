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

interface InterpretationResponse {
  result: TestResult;
  confidence: Confidence;
  reason: string;
  test_type: string;
  test_detected: boolean;
  retake_photo: boolean;
}

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

const IMAGE_REGEX =
  /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;

function isValidResult(value: unknown): value is TestResult {
  return (
    value === "non_reactive" ||
    value === "reactive" ||
    value === "invalid" ||
    value === "uncertain"
  );
}

function isValidConfidence(value: unknown): value is Confidence {
  return (
    value === "high" ||
    value === "medium" ||
    value === "low"
  );
}

export async function POST(request: NextRequest) {
  try {
    let body: InterpretationRequest;

    try {
      body = await request.json();
    } catch {
      return NextResponse.json(
        {
          error: "Invalid request body.",
        },
        {
          status: 400,
        }
      );
    }

    const image = body?.image;
    const selectedTest = body?.selected_test;

    if (!image) {
      return NextResponse.json(
        {
          error: "No test image was provided.",
        },
        {
          status: 400,
        }
      );
    }

    if (!selectedTest) {
      return NextResponse.json(
        {
          error: "No HIV self-test type was selected.",
        },
        {
          status: 400,
        }
      );
    }

    if (
      selectedTest !== "mylan_atomo" &&
      selectedTest !== "oraquick"
    ) {
      return NextResponse.json(
        {
          error: "Invalid HIV self-test type.",
        },
        {
          status: 400,
        }
      );
    }

    const imageMatch = image.match(IMAGE_REGEX);

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
      const base64Data = imageMatch[2].replace(/\s/g, "");

      const imageBytes = Buffer.from(
        base64Data,
        "base64"
      ).byteLength;

      if (imageBytes > MAX_IMAGE_BYTES) {
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
          error: "The test photo could not be processed.",
        },
        {
          status: 400,
        }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      console.error("OPENAI_API_KEY is not configured.");

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

    const testTypeLabel =
      selectedTest === "mylan_atomo"
        ? "Mylan Atomo HIV Self Test"
        : "OraQuick HIV Self-Test";

    const systemPrompt = `
You are a visual screening assistant for HIVClinTest.

Your task is ONLY to visually inspect a photograph of an HIV self-test device.

You are not diagnosing HIV.

The selected test is:

${testTypeLabel}

FIRST determine whether the photograph clearly shows the selected HIV self-test device and its result window.

If:
- no HIV self-test device is visible,
- the photograph shows a person, room, packaging, or unrelated object,
- only the test packaging is visible,
- the result window is not visible,
- the test is too far away,
- the test is substantially cropped,
- the image is blurry,
- glare prevents interpretation,
- lighting prevents interpretation,
- you cannot confidently identify the test result area,

return:

{
  "result": "uncertain",
  "confidence": "low",
  "reason": "The HIV self-test result window is not clearly visible. Please retake the photo with the complete test device and result window clearly visible.",
  "test_detected": false,
  "retake_photo": true
}

Never guess.

CLASSIFICATION:

non_reactive:
Use only when the required control indicator is clearly present and the visible pattern corresponds to a non-reactive result for the selected test.

reactive:
Use when the required control indicator is present and the test indicator is also visible in a pattern corresponding to a reactive self-test.

A faint test indicator may still represent a reactive-looking result.

Never say "HIV positive".

Use the terminology "Reactive self-test".

invalid:
Use when the actual test device is clearly visible but the required control indicator is absent or the device clearly displays an invalid pattern.

Do NOT classify a bad photograph or missing device as invalid.

uncertain:
Use whenever the visual result cannot be reliably determined.

CONFIDENCE:

high:
The device, result area and indicators are clearly visible.

medium:
The result is interpretable but image quality is not ideal.

low:
There is significant uncertainty.

If confidence is low, use uncertain rather than guessing.

Return ONLY valid JSON.

Required format:

{
  "result": "non_reactive",
  "confidence": "high",
  "reason": "Brief description of the visible test appearance.",
  "test_detected": true,
  "retake_photo": false
}
`;

    const userPrompt = `
Examine this photograph of a claimed ${testTypeLabel}.

First confirm that the selected HIV self-test device and result window are actually visible.

Then visually classify the result.

If the device or result window is not clearly visible, return uncertain and request another photograph.
`;

    const response = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",

        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${apiKey}`,
        },

        body: JSON.stringify({
          model: "gpt-4o-mini",

          messages: [
            {
              role: "system",
              content: systemPrompt,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text: userPrompt,
                },
                {
                  type: "image_url",
                  image_url: {
                    url: image,
                    detail: "high",
                  },
                },
              ],
            },
          ],

          temperature: 0,
          max_tokens: 500,

          response_format: {
            type: "json_object",
          },
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "OpenAI interpretation error:",
        response.status,
        errorText
      );

      return NextResponse.json(
        {
          error:
            "The test image could not be interpreted. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    const data = await response.json();

    const content = data?.choices?.[0]?.message?.content;

    if (!content) {
      console.error("OpenAI returned no interpretation.");

      return NextResponse.json(
        {
          error:
            "No interpretation was returned. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    let interpretation: {
      result?: unknown;
      confidence?: unknown;
      reason?: unknown;
      test_detected?: unknown;
      retake_photo?: unknown;
    };

    try {
      interpretation = JSON.parse(content);
    } catch {
      console.error(
        "Could not parse interpretation:",
        content
      );

      return NextResponse.json(
        {
          error:
            "The interpretation could not be processed. Please try again.",
        },
        {
          status: 502,
        }
      );
    }

    if (
      !isValidResult(interpretation.result) ||
      !isValidConfidence(interpretation.confidence) ||
      typeof interpretation.reason !== "string"
    ) {
      console.error(
        "Invalid interpretation:",
        interpretation
      );

      return NextResponse.json(
        {
          error:
            "The interpretation returned an unexpected result.",
        },
        {
          status: 502,
        }
      );
    }

    let result: TestResult = interpretation.result;
    let confidence: Confidence = interpretation.confidence;
    let reason = interpretation.reason.trim();

    let testDetected =
      interpretation.test_detected === true;

    let retakePhoto =
      interpretation.retake_photo === true;

    if (
      confidence === "low" &&
      result !== "uncertain"
    ) {
      result = "uncertain";
      retakePhoto = true;

      reason =
        "The HIV self-test result is not clear enough to interpret reliably. Please retake the photo.";
    }

    if (!testDetected) {
      result = "uncertain";
      confidence = "low";
      retakePhoto = true;
    }

    if (result === "uncertain") {
      retakePhoto = true;
    }

    const finalResult: InterpretationResponse = {
      result,
      confidence,
      reason,
      test_type: testTypeLabel,
      test_detected: testDetected,
      retake_photo: retakePhoto,
    };

    console.log("HIV self-test interpretation completed:", {
      test_type: finalResult.test_type,
      result: finalResult.result,
      confidence: finalResult.confidence,
      test_detected: finalResult.test_detected,
      retake_photo: finalResult.retake_photo,
    });

    return NextResponse.json(finalResult, {
      status: 200,
    });
  } catch (error) {
    console.error(
      "Interpret-test API error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The test interpretation service encountered an error. Please try again.",
      },
      {
        status: 500,
      }
    );
  }
}
