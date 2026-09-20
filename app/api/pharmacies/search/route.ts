import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const city = searchParams.get("city")?.trim() || "";
    const suburb = searchParams.get("suburb")?.trim() || "";

    if (!city && !suburb) {
      return NextResponse.json(
        { error: "Please enter a city, town or suburb." },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error("Missing Supabase environment variables");

      return NextResponse.json(
        {
          error: "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    // Search the preppharmacy table.
    // We only return pharmacy information that is safe to display.
    const select =
      "practice_no,practice_name,practice_contact_no,practice_province,practice_full_address";

    const filters: string[] = [];

    if (city) {
      filters.push(`practice_full_address.ilike.*${city}*`);
    }

    if (suburb) {
      filters.push(`practice_full_address.ilike.*${suburb}*`);
    }

    let url =
      `${supabaseUrl}/rest/v1/preppharmacy` +
      `?select=${encodeURIComponent(select)}`;

    // If both city and suburb are entered,
    // search for either term initially.
    // This prevents an overly restrictive search.
    if (filters.length > 0) {
      url += `&or=(${filters.join(",")})`;
    }

    url += "&limit=30";

    const response = await fetch(url, {
      method: "GET",
      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        "Content-Type": "application/json",
      },
      cache: "no-store",
    });

    const text = await response.text();

    if (!response.ok) {
      console.error("Supabase pharmacy search error:", text);

      return NextResponse.json(
        {
          error: "Unable to search the pharmacy database.",
          details: text,
        },
        { status: response.status }
      );
    }

    let pharmacies = [];

    try {
      pharmacies = JSON.parse(text);
    } catch {
      console.error("Invalid Supabase response:", text);

      return NextResponse.json(
        {
          error: "Invalid response from pharmacy database.",
        },
        { status: 500 }
      );
    }

    return NextResponse.json({
      pharmacies,
      count: pharmacies.length,
    });
  } catch (error) {
    console.error("Pharmacy search API error:", error);

    return NextResponse.json(
      {
        error: "Pharmacy search failed.",
        details:
          error instanceof Error
            ? error.message
            : "Unknown error",
      },
      { status: 500 }
    );
  }
}
