"use client";

import type { AppSettings } from "@/lib/settings";

interface LetterheadProps {
  settings: AppSettings;
  className?: string;
}

export function Letterhead({ settings, className }: LetterheadProps) {
  const { firmLogo, firmName, firmAddress, firmCity, firmState, firmZip, firmPhone, firmEmail, firmWebsite, barNumber, barJurisdiction, letterheadText, letterheadLayout } = settings;

  if (!firmName && !firmLogo) return null;

  const addressLine = [firmAddress, firmCity && firmState ? `${firmCity}, ${firmState}` : firmCity || firmState, firmZip].filter(Boolean).join(" · ");
  const contactLine = [firmPhone, firmEmail, firmWebsite].filter(Boolean).join(" · ");
  const barLine = barNumber ? `Bar No. ${barNumber}${barJurisdiction ? ` — ${barJurisdiction}` : ""}` : "";

  const Logo = firmLogo ? (
    <img src={firmLogo} alt={firmName} style={{ maxHeight: 56, maxWidth: 180, objectFit: "contain", display: "block" }} />
  ) : null;

  if (letterheadLayout === "center") {
    return (
      <div className={className} style={{ textAlign: "center", padding: "16px 0 12px", borderBottom: "0.5px solid rgba(224,224,224,0.18)", marginBottom: 20 }}>
        {Logo && <div style={{ display: "flex", justifyContent: "center", marginBottom: 8 }}>{Logo}</div>}
        {firmName && <div style={{ fontSize: 15, fontWeight: 700, letterSpacing: "0.04em" }}>{firmName}</div>}
        {letterheadText && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{letterheadText}</div>}
        {addressLine && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 3 }}>{addressLine}</div>}
        {contactLine && <div style={{ fontSize: 11, opacity: 0.6 }}>{contactLine}</div>}
        {barLine && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{barLine}</div>}
      </div>
    );
  }

  if (letterheadLayout === "text") {
    return (
      <div className={className} style={{ padding: "12px 0", borderBottom: "0.5px solid rgba(224,224,224,0.18)", marginBottom: 20 }}>
        {firmName && <div style={{ fontSize: 15, fontWeight: 700 }}>{firmName}</div>}
        {letterheadText && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{letterheadText}</div>}
        <div style={{ display: "flex", gap: 16, flexWrap: "wrap", marginTop: 4 }}>
          {addressLine && <span style={{ fontSize: 11, opacity: 0.6 }}>{addressLine}</span>}
          {contactLine && <span style={{ fontSize: 11, opacity: 0.6 }}>{contactLine}</span>}
        </div>
        {barLine && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{barLine}</div>}
      </div>
    );
  }

  // Default: "left" — logo left, text right
  return (
    <div className={className} style={{ display: "flex", alignItems: "flex-start", gap: 16, padding: "12px 0", borderBottom: "0.5px solid rgba(224,224,224,0.18)", marginBottom: 20 }}>
      {Logo && <div style={{ flexShrink: 0 }}>{Logo}</div>}
      <div style={{ flex: 1 }}>
        {firmName && <div style={{ fontSize: 15, fontWeight: 700 }}>{firmName}</div>}
        {letterheadText && <div style={{ fontSize: 11, opacity: 0.7, marginTop: 2 }}>{letterheadText}</div>}
        {addressLine && <div style={{ fontSize: 11, opacity: 0.6, marginTop: 3 }}>{addressLine}</div>}
        {contactLine && <div style={{ fontSize: 11, opacity: 0.6 }}>{contactLine}</div>}
        {barLine && <div style={{ fontSize: 10, opacity: 0.5, marginTop: 2 }}>{barLine}</div>}
      </div>
    </div>
  );
}

export function buildLetterheadHtml(settings: AppSettings): string {
  const { firmLogo, firmName, firmAddress, firmCity, firmState, firmZip, firmPhone, firmEmail, firmWebsite, barNumber, barJurisdiction, letterheadText, letterheadLayout } = settings;
  if (!firmName && !firmLogo) return "";

  const addressLine = [firmAddress, firmCity && firmState ? `${firmCity}, ${firmState}` : firmCity || firmState, firmZip].filter(Boolean).join(" &middot; ");
  const contactLine = [firmPhone, firmEmail, firmWebsite].filter(Boolean).join(" &middot; ");
  const barLine = barNumber ? `Bar No. ${barNumber}${barJurisdiction ? ` &mdash; ${barJurisdiction}` : ""}` : "";
  const logoHtml = firmLogo ? `<img src="${firmLogo}" alt="${firmName}" style="max-height:54pt;max-width:160pt;object-fit:contain;" />` : "";

  if (letterheadLayout === "center") {
    return `<div style="text-align:center;padding-bottom:12pt;margin-bottom:18pt;border-bottom:0.5pt solid #999">
      ${logoHtml ? `<div style="margin-bottom:6pt">${logoHtml}</div>` : ""}
      ${firmName ? `<div style="font-size:14pt;font-weight:bold;letter-spacing:.03em">${firmName}</div>` : ""}
      ${letterheadText ? `<div style="font-size:9pt;color:#555;margin-top:2pt">${letterheadText}</div>` : ""}
      ${addressLine ? `<div style="font-size:9pt;color:#555;margin-top:3pt">${addressLine}</div>` : ""}
      ${contactLine ? `<div style="font-size:9pt;color:#555">${contactLine}</div>` : ""}
      ${barLine ? `<div style="font-size:8pt;color:#777;margin-top:2pt">${barLine}</div>` : ""}
    </div>`;
  }

  if (letterheadLayout === "text") {
    return `<div style="padding-bottom:10pt;margin-bottom:18pt;border-bottom:0.5pt solid #999">
      ${firmName ? `<div style="font-size:14pt;font-weight:bold">${firmName}</div>` : ""}
      ${letterheadText ? `<div style="font-size:9pt;color:#555;margin-top:2pt">${letterheadText}</div>` : ""}
      <div style="font-size:9pt;color:#555;margin-top:3pt">${[addressLine, contactLine].filter(Boolean).join(" &nbsp;&middot;&nbsp; ")}</div>
      ${barLine ? `<div style="font-size:8pt;color:#777;margin-top:2pt">${barLine}</div>` : ""}
    </div>`;
  }

  // left layout
  return `<div style="display:flex;align-items:flex-start;gap:16pt;padding-bottom:10pt;margin-bottom:18pt;border-bottom:0.5pt solid #999">
    ${logoHtml ? `<div style="flex-shrink:0">${logoHtml}</div>` : ""}
    <div style="flex:1">
      ${firmName ? `<div style="font-size:14pt;font-weight:bold">${firmName}</div>` : ""}
      ${letterheadText ? `<div style="font-size:9pt;color:#555;margin-top:2pt">${letterheadText}</div>` : ""}
      ${addressLine ? `<div style="font-size:9pt;color:#555;margin-top:3pt">${addressLine}</div>` : ""}
      ${contactLine ? `<div style="font-size:9pt;color:#555">${contactLine}</div>` : ""}
      ${barLine ? `<div style="font-size:8pt;color:#777;margin-top:2pt">${barLine}</div>` : ""}
    </div>
  </div>`;
}
