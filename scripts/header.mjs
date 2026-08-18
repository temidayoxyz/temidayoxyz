// Generates charts/header.svg — the clean banner at the top of the profile.
// Minimal dark card that matches the other profile cards: gradient name,
// thin accent line, muted tagline. Pure static content.
//
// Usage: node scripts/header.mjs

import { writeFileSync } from "node:fs";

const W = 900;
const H = 150;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="accent" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0%" stop-color="#38bdf8"/>
      <stop offset="100%" stop-color="#a78bfa"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="#0d1117" rx="16" stroke="#1f2430" stroke-width="1"/>
  <text x="${W / 2}" y="72" fill="url(#accent)" font-size="46" font-weight="bold" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" letter-spacing="1">Temidayo</text>
  <rect x="${W / 2 - 34}" y="88" width="68" height="3" rx="1.5" fill="url(#accent)"/>
  <text x="${W / 2}" y="122" fill="#8b949e" font-size="16" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Just another dev on the internet — building useful things, sometimes by accident</text>
</svg>`;

writeFileSync("charts/header.svg", svg);
console.log("Wrote charts/header.svg");
