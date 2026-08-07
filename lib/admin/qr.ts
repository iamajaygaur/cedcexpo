import "server-only";

import QRCode from "qrcode";

import { teamQrUrl } from "@/lib/utils/app-url";

export async function generateTeamQrDataUrl(
  qrIdentifier: string,
): Promise<string> {
  const url = teamQrUrl(qrIdentifier);
  return QRCode.toDataURL(url, {
    errorCorrectionLevel: "M",
    margin: 2,
    width: 512,
    color: {
      dark: "#191c1d",
      light: "#ffffff",
    },
  });
}
