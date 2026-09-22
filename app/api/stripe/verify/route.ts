import { NextResponse } from "next/server";
import Stripe from "stripe";

export const runtime = "nodejs";

const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY!
);

export async function GET(request: Request) {
  try {
    const { searchParams } =
      new URL(request.url);

    const sessionId =
      searchParams.get("session_id");

    if (!sessionId) {
      return NextResponse.json(
        {
          paid: false,
          error: "Missing session_id",
        },
        { status: 400 }
      );
    }

    const session =
      await stripe.checkout.sessions.retrieve(
        sessionId
      );

    const paid =
      session.payment_status === "paid";

    return NextResponse.json({
      paid,
      sessionId: session.id,
      paymentStatus:
        session.payment_status,
      amountTotal:
        session.amount_total,
      currency: session.currency,
      customerEmail:
        session.customer_details?.email ||
        session.customer_email ||
        null,
      metadata: session.metadata,
    });
  } catch (error) {
    console.error(
      "Stripe verification error:",
      error
    );

    return NextResponse.json(
      {
        paid: false,
        error:
          error instanceof Error
            ? error.message
            : "Payment verification failed.",
      },
      { status: 500 }
    );
  }
}
