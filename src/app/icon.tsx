import { ImageResponse } from "next/og";

export const size = { width: 512, height: 512 };
export const contentType = "image/png";

export default function Icon() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          background: "#ffffff",
        }}
      >
        <svg
          width="320"
          height="320"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#0f2a4a"
          strokeWidth={1.3}
        >
          <path d="M12 21s7-7.58 7-12.5A7 7 0 1 0 5 8.5C5 13.42 12 21 12 21z" />
          <circle cx="12" cy="8.5" r="2.5" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
