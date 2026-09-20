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
          You need confirmatory HIV testing by a healthcare
          professional.
        </p>

        <Link
          href="/assessment?confirmatory=yes"
          className="start-button"
          style={{
            display: "inline-block",
            textDecoration: "none",
            textAlign: "center",
          }}
        >
          Get Confirmatory Testing
        </Link>

        <p className="screening-note">
          Do not consider yourself HIV positive based on this
          screening result alone.
        </p>
      </section>
    </main>
  );
}
