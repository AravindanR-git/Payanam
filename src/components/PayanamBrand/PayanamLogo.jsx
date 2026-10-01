import { useState } from "react";

const ASSETS = {
  full: "/branding/payanam-full.png",
  icon: "/branding/payanam-icon.png",
};

export default function PayanamLogo({ variant = "full", className = "", decorative = false }) {
  const [failed, setFailed] = useState(false);
  const src = ASSETS[variant] || ASSETS.full;
  if (failed) {
    return <span className={`payanam-logo-fallback ${className}`} aria-hidden={decorative || undefined}>Payanam</span>;
  }
  return (
    <img
      className={className}
      src={src}
      alt={decorative ? "" : "Payanam"}
      aria-hidden={decorative || undefined}
      onError={() => setFailed(true)}
    />
  );
}
