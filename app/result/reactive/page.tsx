
import Link from "next/link";

export default function ReactiveResultPage() {
  return (
    <main
      style={{
        maxWidth: 680,
        margin: "0 auto",
        padding: "40px 22px",
        fontFamily: "Arial, sans-serif",
        color: "#193d36",
      }}
    >
      <Link
        href="/test"
        style={{ color: "#176b58" }}
      >
        ← Back
      </Link>

      <p
        style={{
          marginTop: 65,
          letterSpacing: 3,
          fontWeight: 700,
        }}
      >
        YOUR RESULT
      </p>

      <h1
        style={{
          fontSize: "clamp(44px, 9vw, 76px)",
          lineHeight: 1.08,
        }}
      >
        Your self-test result is reactive
      </h1>

      <div
        style={{
          background: "#e8f7f2",
          borderLeft: "6px solid #187660",
          padding: 24,
          borderRadius: 12,
          fontSize: 22,
          fontWeight: 700,
        }}
      >
        A reactive HIV self-test is NOT a
        confirmed HIV diagnosis.
      </div>

      <p
        style={{
          fontSize: 21,
          lineHeight: 1.6,
        }}
      >
        You need confirmatory HIV testing
        by a trained healthcare professional.
        Please arrange this promptly.
      </p>

      <Link
        href="/assessment/confirmatory-testing"
        style={{
          display: "inline-block",
          background: "#176b58",
          color: "white",
          padding: "20px 25px",
          borderRadius: 50,
          textDecoration: "none",
          fontSize: 20,
          fontWeight: 700,
        }}
      >
        Arrange Confirmatory Testing
      </Link>

      <p
        style={{
          lineHeight: 1.6,
          color: "#536561",
          marginTop: 30,
        }}
      >
        Do not consider yourself HIV positive
        based on this screening result alone.
      </p>
    </main>
  );
}
