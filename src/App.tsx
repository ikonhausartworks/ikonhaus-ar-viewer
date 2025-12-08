// src/App.tsx

import { Link } from "react-router-dom";

function App() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#111",
        color: "#fff",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "24px",
        textAlign: "center",
      }}
    >
      <h1 style={{ fontSize: "2.4rem", marginBottom: "12px" }}>
        IkonHaus AR Viewer
      </h1>
      <p style={{ marginBottom: "24px", maxWidth: "420px", opacity: 0.8 }}>
        Preview IkonHaus artworks at true scale before you buy. Start with
        “Madness is Genius” below.
      </p>

      <Link
        to="/ar/madness-is-genius"
        style={{
          padding: "12px 24px",
          borderRadius: "999px",
          backgroundColor: "#fff",
          color: "#000",
          fontWeight: 600,
          textDecoration: "none",
        }}
      >
        Launch AR Preview
      </Link>
    </div>
  );
}

export default App;
