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

type AIResult = {
  result?: TestResult;
  confidence?: Confidence;
  reason?: string;
  test_detected?: boolean;
  result_window_visible?: boolean;
  control_line_visible?: boolean | null;
  test_line_visible?: boolean | null;
  retake_photo?: boolean;
};

const MAX_IMAGE_BYTES = 8 * 1024 * 1024;

export async function POST(
  request: NextRequest
) {
  try {
    // -----------------------------------------
    // READ REQUEST
    // -----------------------------------------

    const body = await request.json();

    const image = body?.image as string | undefined;

    const selectedTest =
      body?.selected_test as
