import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type Pharmacy = {
  practice_no: string | number | null;
  practice_name: string | null;
  practice_contact_no: string | null;
  practice_province: string | null;
  practice_full_address: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const city =
      searchParams.get("city")?.trim() || "";

    const suburb =
      searchParams.get("suburb")?.trim() || "";

    const purpose =
      searchParams.get("purpose")?.trim() || "prep";

    // -------------------------------------------------------
    // VALIDATE LOCATION
    // -------------------------------------------------------

    if (!city && !suburb) {
      return NextResponse.json(
        {
          success: false,
          error: "Please enter a city, town or suburb.",
        },
        { status: 400 }
      );
    }

    // -------------------------------------------------------
    // SUPABASE ENVIRONMENT VARIABLES
    // -------------------------------------------------------

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

    const supabaseKey =
      process.env.SUPABASE_SECRET_KEY?.trim();

    if (!supabaseUrl) {
      console.error(
        "NEXT_PUBLIC_SUPABASE_URL is missing"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "NEXT_PUBLIC_SUPABASE_URL is not configured.",
        },
        { status: 500 }
      );
    }

    if (!supabaseKey) {
      console.error(
        "SUPABASE_SECRET_KEY is missing"
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "SUPABASE_SECRET_KEY is not configured.",
        },
        { status: 500 }
      );
    }

    console.log("PHARMACY SEARCH START");
    console.log("City:", city);
    console.log("Suburb:", suburb);
    console.log("Purpose:", purpose);

    // Never log the secret key.

    // -------------------------------------------------------
    // SAFE PUBLIC FIELDS ONLY
    // -------------------------------------------------------

    const selectFields = [
      "practice_no",
      "practice_name",
      "practice_contact_no",
      "practice_province",
      "practice_full_address",
    ].join(",");

    // -------------------------------------------------------
    // BUILD POSTGREST QUERY
    // -------------------------------------------------------

    const query = new URLSearchParams();

    query.set("select", selectFields);
    query.set("limit", "100");

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
      "Searching Supabase preppharmacy table"
    );

    // -------------------------------------------------------
    // CALL SUPABASE
    // -------------------------------------------------------

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

    // -------------------------------------------------------
    // SUPABASE ERROR
    // -------------------------------------------------------

    if (!response.ok) {
      console.error(
        "SUPABASE PHARMACY ERROR:",
        responseText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase rejected the pharmacy search.",
          supabaseStatus: response.status,
          details: responseText,
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------
    // PARSE RESPONSE
    // -------------------------------------------------------

    let rows: Pharmacy[];

    try {
      rows = JSON.parse(responseText);
    } catch {
      console.error(
        "Invalid Supabase JSON:",
        responseText
      );

      return NextResponse.json(
        {
          success: false,
          error:
            "Supabase returned an invalid response.",
        },
        { status: 500 }
      );
    }

    if (!Array.isArray(rows)) {
      return NextResponse.json(
        {
          success: false,
          error:
            "Unexpected pharmacy database response.",
        },
        { status: 500 }
      );
    }

    // -------------------------------------------------------
    // REMOVE DUPLICATE PRACTICES
    // -------------------------------------------------------

    const uniquePharmacies =
      new Map<string, Pharmacy>();

    for (const pharmacy of rows) {
      const key =
        pharmacy.practice_no?.toString() ||
        `${pharmacy.practice_name || ""}-${pharmacy.practice_full_address || ""}`;

      if (!uniquePharmacies.has(key)) {
        uniquePharmacies.set(
          key,
          pharmacy
        );
      }
    }

    const pharmacies =
      Array.from(
        uniquePharmacies.values()
      ).slice(0, 30);

    console.log(
      "Pharmacies found:",
      pharmacies.length
    );

    // -------------------------------------------------------
    // SUCCESS
    // -------------------------------------------------------

    return NextResponse.json({
      success: true,

      purpose,

      location: {
        city,
        suburb,
      },

      count: pharmacies.length,

      pharmacies,
    });
  } catch (error) {
    console.error(
      "PHARMACY SEARCH API CRASH:",
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
