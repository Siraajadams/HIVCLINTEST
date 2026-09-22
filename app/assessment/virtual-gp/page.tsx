export default function VirtualGPPage() {
  return (
    <main
      style={{
        minHeight: "100vh",
        padding: "60px 20px",
        fontFamily: "Arial, sans-serif",
        background: "#f8fafc",
      }}
    >
      <div
        style={{
          maxWidth: "700px",
          margin: "0 auto",
          background: "white",
          padding: "40px",
          borderRadius: "24px",
        }}
      >
        <h1>Virtual GP Consultation</h1>

        <p>
          HIVClinTest Virtual GP route is working.
        </p>

        <button
          style={{
            width: "100%",
            marginTop: "30px",
            padding: "20px",
            border: "none",
            borderRadius: "14px",
            background: "#39ff14",
            color: "#052e16",
            fontSize: "18px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Virtual GP Consultation — R250
        </button>
      </div>
    </main>
  );
}
