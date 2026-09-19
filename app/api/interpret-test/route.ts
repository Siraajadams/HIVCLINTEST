import { NextRequest, NextResponse } from "next/server";

interface InterpretationRequest {
  image: string;
  selected_test: string;
}

interface InterpretationResponse {
  result: "non_reactive" | "reactive" | "invalid" | "uncertain";
  confidence: "high" | "medium" | "low";
  reason: string;
  test_type: string;
}

export async function POST(request: NextRequest) {
  try {
    const { image, selected_test }: InterpretationRequest = await request.json();

    // Validate inputs
    if (!image || !selected_test) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Validate image format and size before forwarding it to OpenAI.
    const imageMatch = image.match(/^data:(image\/(?:jpeg|jpg|png|webp|gif));base64,([A-Za-z0-9+/=]+)$/);
    if (!imageMatch) {
      return NextResponse.json({ error: "Invalid image format" }, { status: 400 });
    }
    const imageBytes = Buffer.from(imageMatch[2], "base64").byteLength;
    if (imageBytes > 5 * 1024 * 1024) {
      return NextResponse.json({ error: "Image size must be less than 5MB" }, { status: 413 });
    }
    if (!["mylan_atomo", "oraquick"].includes(selected_test)) {
      return NextResponse.json({ error: "Invalid test type" }, { status: 400 });
    }

    // Get API key from environment
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      console.error("[v0] OpenAI API key not configured");
      return NextResponse.json({ error: "API configuration error" }, { status: 500 });
    }

    // Determine test type for prompt
    const testTypeLabel = selected_test === "mylan_atomo" ? "Mylan/Atomo" : selected_test === "oraquick" ? "OraQuick" : "HIV self-test";

    // Create the prompt for OpenAI
    const systemPrompt = `You are an AI assistant that helps interpret HIV self-test results visually. 
Your ONLY task is to visually analyze a photo of an HIV self-test device and classify the visual appearance into one of these categories:
- non_reactive: Only one clear line is visible at the control position
- reactive: Two clear lines are visible (control and test lines both present)
- invalid: Only the test line is visible without a control line, no lines are visible, or the device indicates an invalid result
- uncertain: The image is too unclear to make a confident determination

Important guidelines:
1. You are NOT diagnosing HIV. You are only visually interpreting the test device appearance.
2. If the image is unclear, poorly lit, cropped, or you cannot confidently identify the control area, respond "uncertain"
3. For reactive-looking results, use the terminology "Reactive self-test" only - never use "HIV positive" or diagnostic language
4. Be conservative - if unsure, choose "uncertain" rather than guessing
5. Provide a confidence level: high (very clear), medium (reasonably clear), or low (somewhat unclear but interpretable)
6. Provide a brief technical explanation of what you see

Respond ONLY with valid JSON in this exact format:
{
  "result": "non_reactive" | "reactive" | "invalid" | "uncertain",
  "confidence": "high" | "medium" | "low",
  "reason": "Brief technical description of visual appearance"
}

Do not include any other text or explanation outside the JSON.`;

    const userPrompt = `Please interpret this ${testTypeLabel} HIV self-test result image. Classify the visual appearance and provide your interpretation.`;

    // Call OpenAI Vision API
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
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
                },
              },
            ],
          },
        ],
        max_tokens: 500,
        temperature: 0,
        response_format: { type: "json_object" },
      }),
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("[v0] OpenAI API error:", errorData);
      return NextResponse.json({ error: "Failed to interpret image" }, { status: 500 });
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content;

    if (!content) {
      console.error("[v0] No content in OpenAI response");
      return NextResponse.json({ error: "Invalid API response" }, { status: 500 });
    }

    // Parse the JSON response from OpenAI
    let interpretation;
    try {
      interpretation = JSON.parse(content);
    } catch (e) {
      console.error("[v0] Failed to parse OpenAI response:", content);
      return NextResponse.json({ error: "Failed to parse interpretation" }, { status: 500 });
    }

    // Validate the interpretation response
    if (
      !interpretation.result ||
      !interpretation.confidence ||
      !interpretation.reason ||
      !["non_reactive", "reactive", "invalid", "uncertain"].includes(interpretation.result) ||
      !["high", "medium", "low"].includes(interpretation.confidence)
    ) {
      console.error("[v0] Invalid interpretation structure:", interpretation);
      return NextResponse.json({ error: "Invalid interpretation format" }, { status: 500 });
    }

    const result: InterpretationResponse = {
      result: interpretation.result,
      confidence: interpretation.confidence,
      reason: interpretation.reason,
      test_type: testTypeLabel,
    };

    return NextResponse.json(result);
  } catch (error) {
    console.error("[v0] Error in interpret-test:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
