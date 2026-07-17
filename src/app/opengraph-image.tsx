import { ImageResponse } from "next/og";
import { globeMarkDataUri } from "@/lib/globe-mark";

export const alt =
  "Distributed Concepts — Learn distributed systems through interactive 3D visualizations";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          background:
            "radial-gradient(ellipse 80% 80% at 85% 50%, #052e22 0%, #0a0a0a 60%)",
          color: "#fafafa",
          padding: "80px",
          fontFamily: "sans-serif",
          position: "relative",
        }}
      >
        {/* globe mark, echoing the favicon */}
        { }
        <img
          src={globeMarkDataUri({ background: false })}
          width={620}
          height={620}
          alt=""
          style={{ position: "absolute", right: -70, top: 10 }}
        />
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            maxWidth: "680px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: "14px",
              color: "#10b981",
              fontSize: "26px",
              letterSpacing: "4px",
              textTransform: "uppercase",
            }}
          >
            <div
              style={{
                width: "40px",
                height: "2px",
                background: "#10b981",
              }}
            />
            Interactive 3D
          </div>
          <div
            style={{
              fontSize: "84px",
              fontWeight: 700,
              lineHeight: 1.05,
              marginTop: "24px",
              letterSpacing: "-2px",
            }}
          >
            Distributed Concepts
          </div>
          <div
            style={{
              fontSize: "32px",
              color: "#a1a1aa",
              marginTop: "28px",
              lineHeight: 1.4,
            }}
          >
            Replication, consistency & failover — explained on a live globe
          </div>
        </div>
      </div>
    ),
    size
  );
}
