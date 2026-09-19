import Link from "next/link";

export default function NonReactivePage() {
  return (
    <main className="flow-page">
      <header className="nav flow-nav">
        <Link className="brand" href="/">
          <span className="brand-mark">+</span> HIVClinTest
        </Link>

        <div className="confidential">Private and confidential</div>
      </header>

      <section className="flow-shell result-shell">
        <Link className="back-link" href="/test">
          Back
        </Link>

        <p className="eyebrow">Your result</p>

        <h1>Your self-test result is non-reactive</h1>

        <p className="result-lead">
          No HIV antibodies were detected by this self-test.
        </p>

        <p className="flow-subtitle">
          A non-reactive result does not always exclude recent HIV infection.
          If you have had a recent possible exposure, repeat testing or
          professional testing may be needed.
        </p>

        <div className="question-card">
          <h2>Have you had a possible HIV exposure recently?</h2>

          <div className="choice-row">
            <Link
              className="choice-button"
              href="/assessment?exposure=yes"
            >
              Yes
            </Link>

            <Link
              className="choice-button"
              href="/assessment?exposure=no"
            >
              No
            </Link>

            <Link
              className="choice-button"
              href="/assessment?exposure=unsure"
            >
              I&apos;m not sure
            </Link>
          </div>
        </div>

        <p className="screening-note">
          This tool provides educational support and does not provide a
          definitive diagnosis.
        </p>
      </section>
    </main>
  );
}
