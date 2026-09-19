import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

const allowedAnswers = new Set(["yes", "no", "unsure"]);

export async function POST(request: Request) {
  try {
    const body = await request.json();
    if (typeof body.patient_id !== "string" || !allowedAnswers.has(body.possible_exposure)) {
      return NextResponse.json({ error: "A valid patient and exposure answer are required." }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    const { error } = await supabase.from("exposure_assessments").insert({
      patient_id: body.patient_id,
      self_test_id: typeof body.self_test_id === "string" ? body.self_test_id : null,
      possible_exposure: body.possible_exposure,
    });

    if (error) {
      return NextResponse.json({ error: "Unable to save exposure assessment." }, { status: 500 });
    }

    return NextResponse.json({ saved: true }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid exposure request." }, { status: 400 });
  }
}
