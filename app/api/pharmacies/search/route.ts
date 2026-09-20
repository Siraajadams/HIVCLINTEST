import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Supabase environment variables are missing." },
        { status: 500 }
      );
    }

    const supabase = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          persistSession: false,
          autoRefreshToken: false,
        },
      }
    );

    const searchParams = request.nextUrl.searchParams;

    const city = (searchParams.get("city") || "").trim();
    const suburb = (searchParams.get("suburb") || "").trim();

    if (!city && !suburb) {
      return NextResponse.json(
        { error: "Please enter a city or suburb." },
        { status: 400 }
      );
    }

    /*
      Search only ACTIVE providers.

      We deliberately return only the pharmacy information
      required by the patient-facing website.

      ID number, pharmacist email and other private fields
      are NOT returned.
    */

    let query = supabase
      .from("preppharmacy")
      .select(`
        practice_no,
        practice_name,
        practice_contact_no,
        practice_province,
        practice_full_address
      `)
      .eq("pimart_status", "active")
      .eq("profession_description", "Pharmacist")
      .limit(100);

    const terms = [suburb, city]
      .map((value) => value.trim())
      .filter(Boolean);

    if (terms.length > 0) {
      const filters: string[] = [];

      for (const term of terms) {
        filters.push(`practice_full_address.ilike.%${term}%`);
        filters.push(`practice_name.ilike.%${term}%`);
        filters.push(`practice_province.ilike.%${term}%`);
      }

      query = query.or(filters.join(","));
    }

    const { data, error } = await query;

    if (error) {
      console.error("Pharmacy search error:", error);

      return NextResponse.json(
        {
          error: "Unable to search pharmacies.",
          details: error.message,
        },
        { status: 500 }
      );
    }

    /*
      Remove duplicate pharmacy practices.
    */

    const unique = new Map<string, any>();

    for (const row of data || []) {
      const key =
        row.practice_no?.toString() ||
        `${row.practice_name}-${row.practice_full_address}`;

      if (!unique.has(key)) {
        unique.set(key, row);
      }
    }

    const pharmacies = Array.from(unique.values()).slice(0, 25);

    return NextResponse.json({
      pharmacies,
      count: pharmacies.length,
    });
  } catch (error) {
    console.error("Unexpected pharmacy search error:", error);

    return NextResponse.json(
      { error: "Unexpected server error." },
      { status: 500 }
    );
  }
}
