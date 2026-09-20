import Link from "next/link";

export const dynamic = "force-dynamic";

export default function AssessmentPage() {
  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">+</span> HIVClinTest
        </Link>

        <div className="confidential">
          Private and confidential
        </div>
      </header>

      <section className="flow-shell">
        <Link
          className="back-link"
          href="/result/non-reactive"
        >
          Back
        </Link>

        <p className="eyebrow">
          HIV prevention assessment
        </p>

        <h1>Recent HIV exposure assessment</h1>

        <p className="flow-subtitle">
          We will ask a few confidential questions to help guide
          you to the appropriate next step.
        </p>

        <div className="question-card">
          <h2>Assessment ready</h2>

          <p>
            Your HIV self-test result was non-reactive.
            Continue to assess recent exposure, PEP, PrEP
            and other HIV prevention options.
          </p>
        </div>

        <Link className="start-button" href="/">
          Return Home
        </Link>

        <p className="screening-note">
          HIVClinTest provides educational support and does not
          replace assessment by a healthcare professional.
        </p>
      </section>
    </main>
  );
}
