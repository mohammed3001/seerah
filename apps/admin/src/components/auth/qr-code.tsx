import "server-only";

import QRCode from "qrcode";

interface Props {
  uri: string;
}

/**
 * Server-rendered QR code (SVG).  The TOTP URI is converted to an SVG
 * payload server-side so it never round-trips through the client; we then
 * embed it via dangerouslySetInnerHTML, which is safe because `qrcode`
 * only emits `<svg><path/></svg>` markup with no user-controlled strings.
 */
export async function QrCode({ uri }: Props) {
  const svg = await QRCode.toString(uri, {
    type: "svg",
    margin: 1,
    color: { dark: "#0f172a", light: "#ffffff" },
  });

  return (
    <div
      aria-label="رمز QR لإعداد TOTP"
      className="mx-auto flex h-44 w-44 items-center justify-center rounded-md bg-white p-2"
      // qrcode.toString returns a self-contained <svg> element with only
      // path geometry inside — no user-supplied attributes.
      dangerouslySetInnerHTML={{ __html: svg }}
    />
  );
}
