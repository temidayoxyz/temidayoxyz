// Generates charts/activity.svg — a smooth area chart of daily contributions
// over the last 12 months, from the GraphQL contribution calendar.
// Replaces the github-readme-activity-graph.vercel.app image.
//
// Usage: node scripts/activity.mjs
// Env:   OWNER (required), GITHUB_TOKEN (automatic in Actions)

import { writeFileSync } from "node:fs";
import { fmt } from "./chart-lib.mjs";

const OWNER = process.env.OWNER || "temidayoxyz";
const TOKEN = process.env.GITHUB_TOKEN || "";

const W = 760;
const PAD_L = 44;
const PAD_R = 20;
const PAD_T = 64;
const PAD_B = 30;
const PLOT_W = W - PAD_L - PAD_R;
const PLOT_H = 150;

async function contributionDays() {
  const query = `query { user(login: "${OWNER}") { contributionsCollection { contributionCalendar { totalContributions weeks { contributionDays { date contributionCount } } } } } }`;
  const res = await fetch("https://api.github.com/graphql", {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  if (!res.ok) throw new Error(`GraphQL -> ${res.status}`);
  const data = await res.json();
  const cal = data?.data?.user?.contributionsCollection?.contributionCalendar;
  if (!cal) throw new Error("No contribution calendar returned");
  return cal;
}

async function main() {
  const cal = await contributionDays();
  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const n = days.length;
  if (!n) throw new Error("No contribution days");

  const maxCount = Math.max(1, ...days.map((d) => d.contributionCount));
  const niceMax = Math.max(10, Math.ceil(maxCount / 10) * 10);
  const step = PLOT_W / (n - 1);

  const xs = days.map((_, i) => PAD_L + i * step);
  const ys = days.map((d) => PAD_T + PLOT_H - (d.contributionCount / niceMax) * PLOT_H);
  const yBase = PAD_T + PLOT_H;

  // Smooth area path (midpoint quadratic technique).
  let path = `M ${xs[0].toFixed(1)} ${ys[0].toFixed(1)}`;
  for (let i = 1; i < n; i++) {
    const xMid = ((xs[i - 1] + xs[i]) / 2).toFixed(1);
    const yMid = ((ys[i - 1] + ys[i]) / 2).toFixed(1);
    path += ` Q ${xs[i - 1].toFixed(1)} ${ys[i - 1].toFixed(1)} ${xMid} ${yMid}`;
  }
  path += ` L ${xs[n - 1].toFixed(1)} ${ys[n - 1].toFixed(1)} L ${xs[n - 1].toFixed(1)} ${yBase} L ${xs[0].toFixed(1)} ${yBase} Z`;

  // X labels: one per month (collision-guarded).
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let lastMonth = null;
  let lastLabelX = -60;
  let xLabels = "";
  days.forEach((d, i) => {
    const month = months[parseInt(d.date.slice(5, 7), 10) - 1];
    if (month !== lastMonth && xs[i] - lastLabelX > 55) {
      xLabels += `<text x="${xs[i].toFixed(1)}" y="${yBase + 18}" fill="#8b949e" font-size="11" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">${month}</text>`;
      lastMonth = month;
      lastLabelX = xs[i];
    }
  });

  const grid = `<line x1="${PAD_L}" y1="${yBase}" x2="${W - PAD_R}" y2="${yBase}" stroke="#1f2430" stroke-width="1"/>
  <line x1="${PAD_L}" y1="${PAD_T}" x2="${W - PAD_R}" y2="${PAD_T}" stroke="#1f2430" stroke-width="1"/>
  <text x="${PAD_L - 10}" y="${yBase + 4}" fill="#6e7681" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="end">0</text>
  <text x="${PAD_L - 10}" y="${PAD_T + 4}" fill="#6e7681" font-size="10" font-family="Segoe UI, Arial, sans-serif" text-anchor="end">${niceMax}</text>`;

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${PAD_T + PLOT_H + PAD_B + 34}" viewBox="0 0 ${W} ${PAD_T + PLOT_H + PAD_B + 34}">
  <rect width="${W}" height="${PAD_T + PLOT_H + PAD_B + 34}" fill="#0d1117" rx="14"/>
  <text x="${W / 2}" y="34" fill="#c8d3f5" font-size="19" font-weight="bold" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Contribution Activity — Last 12 Months</text>
  <defs><linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
    <stop offset="0%" stop-color="#38bdf8" stop-opacity="0.35"/>
    <stop offset="100%" stop-color="#38bdf8" stop-opacity="0"/>
  </linearGradient></defs>
  ${grid}
  <path d="${path}" fill="url(#grad)" stroke="#38bdf8" stroke-width="2" stroke-linejoin="round"/>
  ${xLabels}
  <text x="${W / 2}" y="${PAD_T + PLOT_H + PAD_B + 24}" fill="#8b949e" font-size="12" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Daily contributions from the GitHub calendar · ${fmt(cal.totalContributions)} in the last year</text>
</svg>`;

  writeFileSync("charts/activity.svg", svg);
  console.log(`Wrote charts/activity.svg (${n} days, max=${niceMax})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
