import { ImageResponse } from "next/og";
import { globeMarkDataUri } from "@/lib/globe-mark";

export const size = { width: 180, height: 180 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={globeMarkDataUri()}
        width={180}
        height={180}
        alt=""
        style={{ background: "#0a0a0a" }}
      />
    ),
    size
  );
}
