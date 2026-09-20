import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const city =
      request.nextUrl.searchParams.get("city")?.trim() || "";

    const suburb =
      request.nextUrl.searchParams.get("suburb")?.trim() || "";

    if (!city && !suburb) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a city, town or suburb.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    console.log("PHARMACY SEARCH START");
    console.log("City:", city);
    console.log("Suburb:", suburb);
    console.log(
      "Supabase URL configured:",
      Boolean(supabaseUrl)
    );
    console.log(
      "Supabase key configured:",
      Boolean(supabaseKey)
    );

    if (!supabaseUrl) {
      return NextResponse.json(
        {
          success: false,
          error: "NEXT_PUBLIC_SUPABASE_URL is not configured in Vercel.",
        },
        { status: 500 }
      );
    }

    if (!supabaseKey) {
      return NextResponse.json(
        {
          success: false,
          error:
            "NEXT_PUBLIC_SUPABASE_ANON_KEY is not configured in Vercel.",
        },
        { status: 500 }
      );
    }

    const selectFields =
      "practice_no,practice_name,practice_contact_no,practice_province,practice_full_address";

    /*
      Build the Supabase REST query using URLSearchParams
      instead of manually encoding the PostgREST expression.
    */

    const query = new URLSearchParams();

    query.set("select", selectFields);
    query.set("limit", "50");

    const filters: string[] = [];

    if (suburb) {
      filters.push(
        `practice_full_address.ilike.*${suburb}*`
      );

      filters.push(
        `practice_name.ilike.*${suburb}*`
      );
    }

    if (city) {
      filters.push(
        `practice_full_address.ilike.*${city}*`
      );

      filters.push(
        `practice_name.ilike.*${city}*`
      );
    }

    if (filters.length > 0) {
      query.set(
        "or",
        `(${filters.join(",")})`
      );
    }

    const supabaseEndpoint =
      `${supabaseUrl}/rest/v1/preppharmacy?${query.toString()}`;

    console.log(
      "Calling Supabase preppharmacy table"
    );

    const response = await fetch(
      supabaseEndpoint,
      {
        method: "GET",

        headers: {
          apikey: supabaseKey,
          Authorization: `Bearer ${supabaseKey}`,
          Accept: "application/json",
        },

        cache: "no-store",
      }
    );

    const responseText =
      await response.text();

    console.log(
      "Supabase response status:",
      response.status
    );

    if (!response.ok) {
      console.error(
        "SUPABASE ERROR:",
        responseText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase rejected the pharmacy search.",
          supabaseStatus:
            response.status,
          details:
            responseText,
        },
        {
          status: 500,
        }
      );
    }

    let rows: any[] = [];

    try {
      rows = JSON.parse(responseText);
    } catch {
      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase returned invalid JSON.",
          details:
            responseText,
        },
        { status: 500 }
      );
    }

    /*
      Remove duplicate pharmacies because several
      professionals may belong to the same practice.
    */

    const unique =
      new Map<string, any>();

    for (const row of rows) {
      const key =
        row.practice_no?.toString() ||
        `${row.practice_name || ""}-${row.practice_full_address || ""}`;

      if (!unique.has(key)) {
        unique.set(key, row);
      }
    }

    const pharmacies =
      Array.from(unique.values());

    console.log(
      "Pharmacies returned:",
      pharmacies.length
    );

    return NextResponse.json({
      success: true,
      count: pharmacies.length,
      location: {
        city,
        suburb,
      },
      pharmacies,
    });
  } catch (error) {
    console.error(
      "PHARMACY SEARCH CRASH:",
      error
    );

    return NextResponse.json(
      {
        success: false,
        error:
          "Pharmacy search API crashed.",
        details:
          error instanceof Error
            ? error.message
            : String(error),
      },
      { status: 500 }
    );
  }
}
