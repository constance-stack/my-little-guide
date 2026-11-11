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
          background: "#a8573f",
        }}
      >
        <svg
          width="320"
          height="320"
          viewBox="0 0 24 24"
          fill="none"
          stroke="#fdfbf5"
          strokeWidth={1.3}
        >
          <circle cx="12" cy="12" r="9" />
          <path d="M15 9l-4 2-2 4 4-2 2-4z" />
        </svg>
      </div>
    ),
    { ...size }
  );
}
