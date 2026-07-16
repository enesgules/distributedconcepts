// The brand mark: an emerald wireframe globe.
// Kept as an SVG string so next/og ImageResponse can embed it as a
// data-URI <img> (satori's inline-SVG gradient support is unreliable).
export function globeMarkSvg({ background = true } = {}) {
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64">
  <defs>
    <radialGradient id="halo" cx="50%" cy="50%" r="50%">
      <stop offset="55%" stop-color="#10b981" stop-opacity="0.16"/>
      <stop offset="100%" stop-color="#10b981" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="sphere" cx="35%" cy="28%" r="80%">
      <stop offset="0%" stop-color="#1a2e27"/>
      <stop offset="55%" stop-color="#12181a"/>
      <stop offset="100%" stop-color="#0b0d0e"/>
    </radialGradient>
    <linearGradient id="grid" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#6ee7b7"/>
      <stop offset="55%" stop-color="#10b981"/>
      <stop offset="100%" stop-color="#065f46"/>
    </linearGradient>
    <clipPath id="face">
      <circle cx="32" cy="32" r="21"/>
    </clipPath>
  </defs>
  ${background ? '<rect width="64" height="64" fill="#09090b"/>' : ""}
  <circle cx="32" cy="32" r="27" fill="url(#halo)"/>
  <circle cx="32" cy="32" r="21" fill="url(#sphere)"/>
  <g clip-path="url(#face)" fill="none" stroke="url(#grid)" stroke-width="0.7" opacity="0.55">
    <ellipse cx="32" cy="32" rx="21" ry="7.5"/>
    <ellipse cx="32" cy="21.5" rx="16" ry="4.5"/>
    <ellipse cx="32" cy="42.5" rx="16" ry="4.5"/>
    <ellipse cx="32" cy="32" rx="8.5" ry="21"/>
    <ellipse cx="32" cy="32" rx="16.5" ry="21"/>
  </g>
  <circle cx="32" cy="32" r="21" fill="none" stroke="url(#grid)" stroke-width="1" opacity="0.9"/>
</svg>`;
}

export function globeMarkDataUri(opts?: { background?: boolean }) {
  return `data:image/svg+xml,${encodeURIComponent(globeMarkSvg(opts))}`;
}
