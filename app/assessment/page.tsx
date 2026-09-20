import Link from "next/link";
import AssessmentClient from "./AssessmentClient";

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

        <AssessmentClient />

        <p className="screening-note">
          HIVClinTest provides educational support and does not
          replace assessment by a healthcare professional.
        </p>

      </section>
    </main>
  );
}
