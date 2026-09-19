import Link from "next/link";

export default function HomePage() {
  return (
    <main className="home">
      <header className="nav">
        <div className="brand">
          <span className="brand-mark">+</span> HIVClinTest
        </div>
        <div className="confidential">Private and confidential</div>
      </header>

      <section className="hero" aria-labelledby="page-title">
        <div>
          <p className="eyebrow">Clear guidance, when you need it</p>
          <h1 id="page-title">HIV Self-Test Results Interpreter</h1>
          <p className="intro">
            Confidential HIV self-testing support and results interpretation,
            designed to help you understand your next step with confidence.
          </p>
          <Link className="start-button" href="/register">
            Start HIV Self-Test
          </Link>
          <p className="support-note">Your information stays private.</p>
        </div>

        <aside className="info-card" aria-label="How HIVClinTest helps">
          <h2>Support that puts you first</h2>
          <ul className="info-list">
            <li>Interpret your self-test result in a few simple steps.</li>
            <li>Receive clear, respectful guidance without judgment.</li>
            <li>Know when to connect with a healthcare professional.</li>
          </ul>
        </aside>
      </section>

      <footer className="footer">
        HIVClinTest provides educational support and does not replace medical care.
      </footer>
    </main>
  );
}
