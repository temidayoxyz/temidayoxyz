// Generates charts/calendar.svg — a GitHub-style contribution grid for the
// last 12 months, from the GraphQL contribution calendar.
// Replaces the ghchart.rshah.org image (flaky third-party service).
//
// Usage: node scripts/calendar.mjs
// Env:   OWNER (required), GITHUB_TOKEN (automatic in Actions)

import { writeFileSync } from "node:fs";
import { esc, fmt, svgCard } from "./chart-lib.mjs";

const OWNER = process.env.OWNER || "temidayoxyz";
const TOKEN = process.env.GITHUB_TOKEN || "";

const CELL = 11;
const STEP = 13;
const PAD = 24;

// GitHub-dark intensity scale
const LEVELS = [
  { max: 0, color: "#161b22" },
  { max: 3, color: "#0e4429" },
  { max: 6, color: "#006d32" },
  { max: 9, color: "#26a641" },
  { max: Infinity, color: "#39d353" },
];
const colorOf = (count) => LEVELS.find((l) => count <= l.max).color;

async function contributionWeeks() {
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
  const cal = await contributionWeeks();
  const weeks = cal.weeks;

  const width = PAD * 2 + weeks.length * STEP;
  const gridTop = 62;
  const gridHeight = 7 * STEP;
  const height = gridTop + gridHeight + 52;

  // Month labels under the grid, at the first week of each month.
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  let lastMonth = null;
  let lastLabelX = -50;
  let monthLabels = "";
  weeks.forEach((week, i) => {
    const date = week.contributionDays?.[0]?.date;
    if (!date) return;
    const month = months[parseInt(date.slice(5, 7), 10) - 1];
    const x = PAD + i * STEP;
    if (month !== lastMonth && x - lastLabelX > 28) {
      monthLabels += `<text x="${x}" y="${gridTop - 6}" fill="#8b949e" font-size="10" font-family="Segoe UI, Arial, sans-serif">${month}</text>`;
      lastMonth = month;
      lastLabelX = x;
    }
  });

  // Grid cells
  let cells = "";
  weeks.forEach((week, i) => {
    week.contributionDays.forEach((day, j) => {
      cells += `<rect x="${PAD + i * STEP}" y="${gridTop + j * STEP}" width="${CELL}" height="${CELL}" rx="2" fill="${colorOf(day.contributionCount)}"><title>${esc(day.date)}: ${day.contributionCount} contributions</title></rect>`;
    });
  });

  // Legend
  const legendX = PAD + weeks.length * STEP - 150;
  const legend = `<text x="${legendX}" y="${gridTop + gridHeight + 20}" fill="#8b949e" font-size="11" font-family="Segoe UI, Arial, sans-serif">Less</text>
  ${LEVELS.map((l, i) => `<rect x="${legendX + 32 + i * 15}" y="${gridTop + gridHeight + 12}" width="11" height="11" rx="2" fill="${l.color}"/>`).join("")}
  <text x="${legendX + 32 + LEVELS.length * 15 + 6}" y="${gridTop + gridHeight + 20}" fill="#8b949e" font-size="11" font-family="Segoe UI, Arial, sans-serif">More</text>
  <text x="${width - PAD}" y="${gridTop + gridHeight + 20}" fill="#c8d3f5" font-size="11" font-family="Segoe UI, Arial, sans-serif" text-anchor="end">${fmt(cal.totalContributions)} contributions in the last year</text>`;

  const svg = svgCard({
    width,
    height,
    title: "Contribution Calendar — Last 12 Months",
    body: monthLabels + cells + legend,
    footer: "Auto-generated from the GitHub contribution calendar — refreshed every 6 hours",
  });

  writeFileSync("charts/calendar.svg", svg);
  console.log(`Wrote charts/calendar.svg (${weeks.length} weeks, ${fmt(cal.totalContributions)} contributions)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
