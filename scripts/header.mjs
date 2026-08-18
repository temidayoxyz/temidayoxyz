// Generates charts/header.svg — the gradient banner at the top of the
// profile. Replaces the capsule-render.vercel.app image (another free-tier
// service that can pause at any time). Pure static content.
//
// Usage: node scripts/header.mjs

import { writeFileSync } from "node:fs";

const W = 900;
const H = 180;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
      <stop offset="0%" stop-color="#2563eb"/>
      <stop offset="45%" stop-color="#7c3aed"/>
      <stop offset="100%" stop-color="#db2777"/>
    </linearGradient>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#bg)" rx="16"/>
  <text x="${W / 2}" y="${H / 2 + 16}" fill="#ffffff" font-size="48" font-weight="bold" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Hi there, I'm Temidayo 👋</text>
  <text x="${W / 2}" y="${H / 2 + 52}" fill="#f5f5ff" font-size="17" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle" opacity="0.9">Building useful things on the internet — sometimes by accident</text>
</svg>`;

writeFileSync("charts/header.svg", svg);
console.log("Wrote charts/header.svg");
