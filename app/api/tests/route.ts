import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const allowedTests = new Set(["mylan_atomo", "oraquick", "unknown"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.patient_id !== "string" || !allowedTests.has(body.test_type)) {
      return NextResponse.json({ error: "A valid patient and test type are required." }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    const selfTestId = crypto.randomUUID();
    const { error } = await supabase.from("hiv_self_tests").insert({
      id: selfTestId,
      patient_id: body.patient_id,
      test_type: body.test_type,
      sample_type: body.sample_type ?? null,
    });

    if (error) {
      return NextResponse.json({ error: "Unable to save test selection." }, { status: 500 });
    }

    return NextResponse.json({ self_test_id: selfTestId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid test request." }, { status: 400 });
  }
}
