import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type TestType = "mylan_atomo" | "oraquick";
type TestResult = "non_reactive" | "reactive" | "invalid" | "uncertain";
type Confidence = "high" | "medium" | "low";

type AIResult = {
  result: TestResult;
  confidence: Confidence;
  reason: string;
  test_detected: boolean;
  result_window_visible: boolean;
  control_line_visible: boolean | null;
  test_line_visible: boolean | null;
  retake_photo: boolean;
};

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const image = body?.image as string | undefined;
    const selectedTest = body?.selected_test as TestType | undefined;

    if (!image) {
      return NextResponse.json(
        { error: "No test image was provided." },
        { status: 400 }
      );
    }

    if (
      selectedTest !== "mylan_atomo" &&
      selectedTest !== "oraquick"
    ) {
      return NextResponse.json(
        { error: "Invalid HIV self-test type." },
        { status: 400 }
      );
    }

    if (!image.startsWith("data:image/")) {
      return NextResponse.json(
        { error: "Invalid image format." },
        { status: 400 }
      );
    }

    const apiKey = process.env.OPENAI_API_KEY?.trim();

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI API key is not configured." },
        { status: 500 }
      );
    }

    const testName =
      selectedTest === "mylan_atomo"
        ? "Mylan / Atomo HIV Self Test"
        : "OraQuick HIV Self-Test";

    const instructions = [
      "You visually interpret HIV self-test result windows.",
      "You are not diagnosing HIV.",
      `The selected test is ${testName}.`,
      "A close-up of the result window is acceptable.",
      "The entire physical test device does not need to be visible.",
      "Do not reject an image merely because the outer casing is cropped.",
      "Focus on the visible C control position and T test position.",
      "If C is visible and T is absent, classify as non_reactive.",
      "If C and T are both visible, classify as reactive.",
      "A faint but genuinely visible T line counts as visible.",
      "If the result window is visible but C is absent, classify as invalid.",
      "Use uncertain only when the result window or lines genuinely cannot be interpreted.",
      "Do not call a reactive result HIV positive.",
      "Call it a Reactive self-test.",
      "Return JSON only.",
      'Use this exact structure: {"result":"reactive","confidence":"high","reason":"The control and test lines are visible.","test_detected":true,"result_window_visible":true,"control_line_visible":true,"test_line_visible":true,"retake_photo":false}'
    ].join(" ");

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
          temperature: 0,
          max_tokens: 400,
          response_format: {
            type: "json_object",
          },
          messages: [
            {
              role: "system",
              content: instructions,
            },
            {
              role: "user",
              content: [
                {
                  type: "text",
                  text:
                    "Interpret this HIV self-test result window. " +
                    "A close-up is acceptable. " +
                    "Identify whether the C control line and T test line are visible. " +
                    "Only request another photo if the result window itself cannot be interpreted.",
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
        }),
      }
    );

    if (!response.ok) {
      const errorText = await response.text();

      console.error(
        "OpenAI API error:",
        response.status,
        errorText
      );

      return NextResponse.json(
        {
          error:
            "The test image could not be interpreted. Please try again.",
        },
        { status: 502 }
      );
    }

    const openAIData = await response.json();

    const content =
      openAIData?.choices?.[0]?.message?.content;

    if (!content) {
      return NextResponse.json(
        {
          error:
            "No interpretation was returned. Please try again.",
        },
        { status: 502 }
      );
    }

    let ai: AIResult;

    try {
      ai = JSON.parse(content) as AIResult;
    } catch {
      console.error("Invalid AI JSON:", content);

      return NextResponse.json(
        {
          error:
            "The interpretation could not be processed.",
        },
        { status: 502 }
      );
    }

    const validResults: TestResult[] = [
      "non_reactive",
      "reactive",
      "invalid",
      "uncertain",
    ];

    const validConfidence: Confidence[] = [
      "high",
      "medium",
      "low",
    ];

    if (
      !validResults.includes(ai.result) ||
      !validConfidence.includes(ai.confidence)
    ) {
      return NextResponse.json(
        {
          error:
            "The interpretation returned an invalid result.",
        },
        { status: 502 }
      );
    }

    const resultWindowVisible =
      ai.result_window_visible === true;

    const controlLineVisible =
      typeof ai.control_line_visible === "boolean"
        ? ai.control_line_visible
        : null;

    const testLineVisible =
      typeof ai.test_line_visible === "boolean"
        ? ai.test_line_visible
        : null;

    let result: TestResult = ai.result;
    let reason = ai.reason || "";
    let retakePhoto = ai.retake_photo === true;

    /*
     * Once the model has identified the result window
     * and C/T line visibility, our code determines
     * the final classification.
     */

    if (
      resultWindowVisible &&
      controlLineVisible === true &&
      testLineVisible === true
    ) {
      result = "reactive";
      retakePhoto = false;
      reason =
        "The control (C) line and test (T) line are both visible.";
    } else if (
      resultWindowVisible &&
      controlLineVisible === true &&
      testLineVisible === false
    ) {
      result = "non_reactive";
      retakePhoto = false;
      reason =
        "The control (C) line is visible and no test (T) line is visible.";
    } else if (
      resultWindowVisible &&
      controlLineVisible === false
    ) {
      result = "invalid";
      retakePhoto = false;
      reason =
        "The required control (C) line is not visible.";
    } else {
      result = "uncertain";
      retakePhoto = true;

      if (!reason) {
        reason =
          "The result window cannot be interpreted reliably. Please retake the photo.";
      }
    }

    return NextResponse.json({
      result,
      confidence: ai.confidence,
      reason,
      test_type: testName,
      test_detected: ai.test_detected === true,
      result_window_visible: resultWindowVisible,
      control_line_visible: controlLineVisible,
      test_line_visible: testLineVisible,
      retake_photo: retakePhoto,
    });
  } catch (error) {
    console.error(
      "Interpret-test error:",
      error
    );

    return NextResponse.json(
      {
        error:
          "The interpretation service encountered an error. Please try again.",
      },
      { status: 500 }
    );
  }
}
