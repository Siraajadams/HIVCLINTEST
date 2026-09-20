import { NextRequest, NextResponse } from "next/server";

export const dynamic = "force-dynamic";

type PharmacyRow = {
  practice_no: string | number | null;
  practice_name: string | null;
  practice_contact_no: string | null;
  practice_province: string | null;
  practice_full_address: string | null;
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);

    const city = searchParams.get("city")?.trim() || "";
    const suburb = searchParams.get("suburb")?.trim() || "";
    const purpose = searchParams.get("purpose")?.trim() || "prep";

    if (!city && !suburb) {
      return NextResponse.json(
        {
          error: "Please enter a city, town or suburb.",
        },
        { status: 400 }
      );
    }

    const supabaseUrl =
      process.env.NEXT_PUBLIC_SUPABASE_URL;

    const supabaseKey =
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
      console.error(
        "Missing Supabase environment variables"
      );

      return NextResponse.json(
        {
          error:
            "Supabase environment variables are missing.",
        },
        { status: 500 }
      );
    }

    /*
     * Only request fields that are appropriate
     * for the patient-facing directory.
     *
     * Do NOT expose:
     * - ID number
     * - pharmacist personal mobile
     * - personal email
     * - professional council number
     */

    const select = [
      "practice_no",
      "practice_name",
      "practice_contact_no",
      "practice_province",
      "practice_full_address",
    ].join(",");

    const filters: string[] = [];

    /*
     * Search the practice address.
     */

    if (suburb) {
      filters.push(
        `practice_full_address.ilike.*${suburb}*`
      );
    }

    if (city) {
      filters.push(
        `practice_full_address.ilike.*${city}*`
      );
    }

    /*
     * Also allow matching the practice name.
     * This can help where the location appears
     * in the pharmacy/practice name.
     */

    if (suburb) {
      filters.push(
        `practice_name.ilike.*${suburb}*`
      );
    }

    if (city) {
      filters.push(
        `practice_name.ilike.*${city}*`
      );
    }

    let url =
      `${supabaseUrl}/rest/v1/preppharmacy` +
      `?select=${encodeURIComponent(select)}`;

    if (filters.length > 0) {
      url +=
        `&or=(${encodeURIComponent(
          filters.join(",")
        )})`;
    }

    url += "&limit=100";

    const response = await fetch(url, {
      method: "GET",

      headers: {
        apikey: supabaseKey,
        Authorization: `Bearer ${supabaseKey}`,
        Accept: "application/json",
      },

      cache: "no-store",
    });

    const responseText =
      await response.text();

    if (!response.ok) {
      console.error(
        "Supabase pharmacy search error:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "Unable to search the pharmacy database.",
          details: responseText,
        },
        {
          status: response.status,
        }
      );
    }

    let rows: PharmacyRow[] = [];

    try {
      rows = JSON.parse(responseText);
    } catch {
      console.error(
        "Invalid Supabase response:",
        responseText
      );

      return NextResponse.json(
        {
          error:
            "Invalid response from pharmacy database.",
        },
        { status: 500 }
      );
    }

    /*
     * Remove duplicate pharmacies.
     *
     * Your imported dataset can contain more
     * than one healthcare professional linked
     * to the same practice.
     */

    const uniquePharmacies =
      new Map<string, PharmacyRow>();

    for (const pharmacy of rows) {
      const key =
        pharmacy.practice_no?.toString() ||
        `${pharmacy.practice_name || ""}-${
          pharmacy.practice_full_address || ""
        }`;

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
      "Pharmacy search API error:",
      error
    );

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
