import Link from "next/link";

export default function ReactivePage() {
  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">+</span>
          HIVClinTest
        </Link>

        <div className="confidential">
          Private and confidential
        </div>
      </header>

      <section className="flow-shell result-shell">
        <Link className="back-link" href="/test">
          ← Back
        </Link>

        <p className="eyebrow">Your result</p>

        <h1>Your self-test result is reactive</h1>

        <div className="important-note">
          <strong>
            A reactive HIV self-test is NOT a confirmed HIV
            diagnosis.
          </strong>
        </div>

        <p className="flow-subtitle">
          Your result needs to be confirmed with further HIV
          testing by a healthcare professional.
        </p>

        {/* Clinical next-step information */}
        <div
          style={{
            marginTop: "28px",
            padding: "26px",
            border: "1px solid #cbded7",
            borderRadius: "24px",
            background: "#f7fbf9",
          }}
        >
          <p
            className="eyebrow"
            style={{ marginTop: 0 }}
          >
            What happens next?
          </p>

          <h2
            style={{
              marginTop: "8px",
              marginBottom: "14px",
            }}
          >
            Speak to a healthcare professional
          </h2>

          <p
            style={{
              margin: 0,
              lineHeight: 1.6,
            }}
          >
            A doctor or appropriately authorised prescribing
            pharmacist should review your result, arrange or
            advise on confirmatory HIV testing, and assess your
            recent HIV exposure history.
          </p>
        </div>

        {/* Important medication routing */}
        <div
          style={{
            marginTop: "20px",
            padding: "24px",
            borderRadius: "24px",
            background: "#fff7f3",
            border: "1px solid #e6c5ba",
          }}
        >
          <strong>
            Do not start the automated PrEP or PEP pathway from
            this result.
          </strong>

          <p
            style={{
              marginBottom: 0,
              lineHeight: 1.6,
            }}
          >
            Your healthcare professional will first review your
            reactive self-test and determine the appropriate
            testing, treatment or prevention pathway.
          </p>
        </div>

        {/* Primary clinical referral */}
        <Link
          href="/assessment/clinical-review?result=reactive"
          className="start-button"
          style={{
            display: "block",
            marginTop: "28px",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Speak to a Healthcare Professional
        </Link>

        {/* In-person option */}
        <Link
          href="/assessment/pharmacy?result=reactive&purpose=confirmatory"
          style={{
            display: "block",
            marginTop: "14px",
            padding: "18px 24px",
            border: "1px solid #16765f",
            borderRadius: "999px",
            color: "#16765f",
            fontWeight: 700,
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Find Confirmatory Testing Near Me
        </Link>

        <p
          className="screening-note"
          style={{ marginTop: "28px" }}
        >
          Do not consider yourself HIV positive based on this
          screening result alone.
        </p>
      </section>
    </main>
  );
}
