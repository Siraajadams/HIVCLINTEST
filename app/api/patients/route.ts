import { NextResponse } from "next/server";
import { supabase } from "@/lib/supabase";

function requiredText(value: unknown) {
  return typeof value === "string" && value.trim().length > 0;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const requiredFields = ["first_name", "surname", "gender", "country", "identity_type", "identity_number", "date_of_birth"];

    if (!requiredFields.every((field) => requiredText(body[field])) || body.consent !== true) {
      return NextResponse.json({ error: "Please provide all required registration details and consent." }, { status: 400 });
    }

    if (!supabase) {
      return NextResponse.json({ error: "Supabase is not configured." }, { status: 503 });
    }

    const patientId = crypto.randomUUID();
    const patient = {
      id: patientId,
      first_name: body.first_name.trim(),
      surname: body.surname.trim(),
      gender: body.gender.trim(),
      country: body.country.trim(),
      identity_type: body.identity_type.trim(),
      identity_number: body.identity_number.trim(),
      date_of_birth: body.date_of_birth,
      mobile_number: requiredText(body.mobile_number) ? body.mobile_number.trim() : null,
      source: body.source === "manual" ? "manual" : "manual",
      consent: true,
      consent_at: new Date().toISOString(),
    };

    const { error } = await supabase.from("patients").insert(patient);
    if (error) {
      return NextResponse.json({ error: "Unable to save registration." }, { status: 500 });
    }

    const { error: consentError } = await supabase.from("consent_records").insert({
      patient_id: patientId,
      consent_type: "hiv_self_testing_support",
      accepted: true,
    });
    if (consentError) {
      return NextResponse.json({ error: "Unable to save consent." }, { status: 500 });
    }

    return NextResponse.json({ patient_id: patientId }, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Invalid registration request." }, { status: 400 });
  }
}
