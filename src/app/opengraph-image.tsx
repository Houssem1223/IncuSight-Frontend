import { ImageResponse } from "next/og";

// Image de partage (Open Graph / Twitter), generee au build aux couleurs
// d'IncuSight. Texte uniquement : aucun chiffre.
export const alt = "IncuSight, la plateforme digitale d'incubation de MEDIANET";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          padding: "72px 80px",
          background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 45%, #eff6ff 100%)",
          color: "#071426",
          fontFamily: "sans-serif",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 20 }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, background: "#f97316", display: "flex" }} />
          <div style={{ display: "flex", flexDirection: "column" }}>
            <span style={{ fontSize: 40, fontWeight: 700 }}>IncuSight</span>
            <span style={{ fontSize: 22, color: "#6b7280" }}>by MEDIANET</span>
          </div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
          <span style={{ fontSize: 22, letterSpacing: 4, color: "#ea580c", fontWeight: 600 }}>
            DIGITAL INCUBATOR PLATFORM
          </span>
          <span style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.1, maxWidth: 980 }}>
            Accélérez les décisions d&apos;incubation avec une gouvernance claire.
          </span>
        </div>
      </div>
    ),
    size,
  );
}
