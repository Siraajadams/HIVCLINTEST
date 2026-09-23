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

/**
 * Maximum image size accepted by this endpoint.
 */
const MAX_IMAGE_BYTES = 5 * 1024 * 1024;

/**
 * Only allow image formats that we expect from the
 * browser camera / image upload.
 */
const IMAGE_REGEX =
  /^data:(image\/(?:jpeg|jpg|png|webp));base64,([A-Za-z0-9+/=\r\n]+)$/;

/**
 * Validate the model output.
 */
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

export async function POST(
  request: NextRequest
) {
  try {
    /*
    ----------------------------------------
    1. READ REQUEST
    ----------------------------------------
    */

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

    /*
    ----------------------------------------
    2. VALIDATE INPUT
    ----------------------------------------
    */

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
      !["mylan_atomo", "oraquick"].includes(
        selectedTest
      )
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

    /*
    ----------------------------------------
    3. VALIDATE IMAGE
    ----------------------------------------
    */

    const imageMatch =
      image.match(IMAGE_REGEX);

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
        imageMatch[2].replace(/\s/g, "");

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

    /*
    ----------------------------------------
    4. OPENAI CONFIGURATION
    ----------------------------------------
    */

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

    /*
    ----------------------------------------
    5. TEST TYPE
    ----------------------------------------
    */

    const testTypeLabel =
      selectedTest === "mylan_atomo"
        ? "Mylan Atomo HIV Self Test"
        : "OraQuick HIV Self-Test";

    /*
    ----------------------------------------
    6. MODEL INSTRUCTIONS
    ----------------------------------------
    */

    const systemPrompt = `
You are a visual screening assistant for HIVClinTest.

Your task is ONLY to inspect a photograph of an HIV self-test device and describe the visible test result.

You are NOT diagnosing HIV.

The selected test is:

${testTypeLabel}

FIRST determine whether the photograph actually contains a sufficiently visible HIV self-test device and result window.

If:
- no HIV self-test device is visible,
- the camera is pointed at a person or room,
- only packaging is visible,
- the result window is outside the photograph,
- the device is too far away,
- the result window is substantially cropped,
- glare prevents interpretation,
- the image is too blurry,
- lighting prevents interpretation,

then return:

{
  "result": "uncertain",
  "confidence": "low",
  "reason": "The HIV self-test result window is not clearly visible. Please retake the photo with the test device and complete result window clearly visible.",
  "test_detected": false,
  "retake_photo": true
}

Do NOT guess a test result when the test device cannot be clearly identified.

-----------------------------------
RESULT CLASSIFICATION
-----------------------------------

If a test device and result window ARE clearly visible, inspect the control and test indicators.

Classify the visual appearance as one of:

"non_reactive"
"reactive"
"invalid"
"uncertain"

NON_REACTIVE

Use "non_reactive" only when the expected control indicator is clearly present and the visual appearance corresponds to a non-reactive result for the selected test.

REACTIVE

Use "reactive" only when the expected control indicator is present and the test indicator is also visible in a pattern corresponding to a reactive result.

A faint visible test indicator may still represent a reactive-looking self-test result.

Never describe this as "HIV positive".

Use the term:

"Reactive self-test"

A reactive HIV self-test is a screening result and requires confirmatory testing by an appropriate healthcare professional or service.

INVALID

Use "invalid" when the actual device is clearly visible but the required control indicator is absent, or the visible device clearly displays an invalid result pattern.

IMPORTANT:

Do NOT classify a missing device, badly positioned photograph, blurry image, cropped result window or photograph of a person/room as "invalid".

Those situations must be classified as "uncertain" and retake_photo must be true.

UNCERTAIN

Use "uncertain" whenever you cannot reliably determine the result.

Examples:

- test too far away
- blurry image
- poor lighting
- glare
- cropped test
- result window not visible
- ambiguous line
- device cannot be identified
- photograph does not contain an HIV self-test

-----------------------------------
CONFIDENCE
-----------------------------------

Use:

"high"
only when the device, result window, control indicator and test indicator area are clearly visible.

"medium"
when the device is interpretable but image quality is not ideal.

"low"
when there is significant uncertainty.

If confidence is low, prefer:

"result": "uncertain"

-----------------------------------
OUTPUT
-----------------------------------

Return ONLY valid JSON.

Do not use markdown.

Do not include text before or after the JSON.

Required structure:

{
  "result": "non_reactive",
  "confidence": "high",
  "reason": "Brief description of the visible test appearance.",
  "test_detected": true,
  "retake_photo": false
}
`;

    const userPrompt = `
Examine this photograph of a claimed ${testTypeLabel} result.

First confirm that the HIV self-test device and its result window are actually visible.

Then visually classify the result.

If the test or result window is not clearly visible, do not guess. Return uncertain and request another photograph.
`;

    /*
    ----------------------------------------
    7. CALL OPENAI
    ----------------------------------------
    */

    const response =
      await fetch(
        "https://api.openai.com/v1/chat/completions",
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json",

            Authorization:
              `Bearer ${apiKey}`,
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

    /*
    ----------------------------------------
    8. HANDLE OPENAI ERROR
    ----------------------------------------
    */

    if (!response.ok) {
      const errorText =
        await response.text();

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

    /*
    ----------------------------------------
    9. READ RESPONSE
    ----------------------------------------
    */

    const data =
      await response.json();

    const content =
      data?.choices?.[0]
        ?.message?.content;

    if (!content) {
      console.error(
        "OpenAI returned no interpretation."
      );

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

    /*
    ----------------------------------------
    10. PARSE JSON
    ----------------------------------------
    */

    let interpretation: {
      result?: unknown;
      confidence?: unknown;
      reason?: unknown;
      test_detected?: unknown;
      retake_photo?: unknown;
    };

    try {
      interpretation =
        JSON.parse(content);
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

    /*
    ----------------------------------------
    11. VALIDATE MODEL RESULT
    ----------------------------------------
    */

    if (
      !isValidResult(
        interpretation.result
      ) ||
      !isValidConfidence(
        interpretation.confidence
      ) ||
      typeof interpretation.reason !==
        "string"
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

    /*
    ----------------------------------------
    12. NORMALISE SAFETY RESULT
    ----------------------------------------
    */

    let result =
      interpretation.result;

    let confidence =
      interpretation.confidence;

    let reason =
      interpretation.reason.trim();

    let testDetected =
      interpretation.test_detected === true;

    let retakePhoto =
      interpretation.retake_photo === true;

    /*
     * Do not allow a low-confidence image
     * to become a definitive visual result.
     */

    if (
      confidence === "low" &&
      result !== "uncertain"
    ) {
      result = "uncertain";
      retakePhoto = true;

      reason =
        "The HIV self-test result is not clear enough to interpret reliably. Please retake the photo.";
    }

    /*
     * If the model says there is no test,
     * always force uncertain.
     */

    if (!testDetected) {
      result = "uncertain";
      confidence = "low";
      retakePhoto = true;
    }

    /*
     * An uncertain result should always
     * request another image.
     */

    if (result === "uncertain") {
      retakePhoto = true;
    }

    /*
    ----------------------------------------
    13. FINAL RESPONSE
    ----------------------------------------
    */

    const finalResult: InterpretationResponse =
      {
        result,
        confidence,
        reason,
        test_type:
          testTypeLabel,
        test_detected:
          testDetected,
        retake_photo:
          retakePhoto,
      };

    console.log(
      "HIV self-test interpreted:",
      {
        test_type:
          testTypeLabel,

        result:
          finalResult.result,

        confidence:
          finalResult.confidence,

        test_detected:
          finalResult.test_detected,

        retake_photo:
          finalResult.retake_photo,
      }
    );

    return NextResponse.json(
      finalResult,
      {
        status: 200,
      }
    );
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
