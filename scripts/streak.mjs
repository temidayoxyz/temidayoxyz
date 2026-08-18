// Generates charts/streak.svg — current streak, longest streak, active days
// and best day, computed from the GitHub contribution calendar (GraphQL).
// Replaces the streak-stats.demolab.com image so no external service is needed.
//
// Usage: node scripts/streak.mjs
// Env:   OWNER (required), GITHUB_TOKEN (automatic in Actions)

import { writeFileSync } from "node:fs";
import { esc, fmt, svgCard, statRows } from "./chart-lib.mjs";

const OWNER = process.env.OWNER || "temidayoxyz";
const TOKEN = process.env.GITHUB_TOKEN || "";

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
  let cal;
  try {
    cal = await contributionDays();
  } catch (err) {
    console.warn("Contribution calendar unavailable:", err.message);
    const fallback = svgCard({
      width: 460,
      height: 120,
      title: "Streak",
      body: `<text x="230" y="78" fill="#8b949e" font-size="14" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Streak data temporarily unavailable — it will reappear on the next refresh</text>`,
    });
    writeFileSync("charts/streak.svg", fallback);
    console.log("Wrote charts/streak.svg (fallback note)");
    return;
  }

  const days = cal.weeks.flatMap((w) => w.contributionDays);
  const today = new Date().toISOString().slice(0, 10);

  // Streak counts consecutive active days ending today (or yesterday if today has none yet).
  let start = days.findIndex((d) => d.date === today);
  if (start === -1) start = days.length - 1;
  let current = 0;
  for (let i = start; i >= 0 && days[i].contributionCount > 0; i--) current += 1;

  let longest = 0;
  let run = 0;
  for (const d of days) {
    run = d.contributionCount > 0 ? run + 1 : 0;
    if (run > longest) longest = run;
  }

  const activeDays = days.filter((d) => d.contributionCount > 0).length;
  const best = days.reduce((a, b) => (b.contributionCount > a.contributionCount ? b : a), days[0]);

  const rows = [
    { icon: "🔥", label: "Current streak", value: `${current} day${current === 1 ? "" : "s"}` },
    { icon: "🏆", label: "Longest streak", value: `${longest} day${longest === 1 ? "" : "s"}` },
    { icon: "📅", label: "Active days (1y)", value: fmt(activeDays) },
    { icon: "✅", label: "Total contributions (1y)", value: fmt(cal.totalContributions) },
    { icon: "🌟", label: "Best day", value: `${fmt(best.contributionCount)} on ${best.date}` },
  ];

  const svg = svgCard({
    width: 460,
    height: 70 + rows.length * 30 + 30,
    title: "Contribution Streak",
    body: statRows(rows, { width: 460 }),
    footer: "Computed from the GitHub contribution calendar — refreshed every 6 hours",
  });

  writeFileSync("charts/streak.svg", svg);
  console.log(`Wrote charts/streak.svg (current=${current}, longest=${longest}, active=${activeDays})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
