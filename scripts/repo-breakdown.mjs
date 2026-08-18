// Generates charts/repo-breakdown.svg — a donut chart of public vs private
// repositories. Public count always works; private count needs a personal
// access token (GH_TOKEN secret, `repo` scope) because GitHub hides private
// repo counts from unauthenticated / bot requests.
//
// Usage: node scripts/repo-breakdown.mjs
// Env:   OWNER (required), GH_TOKEN (optional), GITHUB_TOKEN (fallback)

import { writeFileSync, mkdirSync } from "node:fs";

const OWNER = process.env.OWNER || "temidayoxyz";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const headers = TOKEN ? { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json" } : { Accept: "application/vnd.github+json" };

const outDir = "charts";
const outFile = `${outDir}/repo-breakdown.svg`;

async function json(url) {
  const res = await fetch(url, { headers });
  if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
  return res.json();
}

function svg(publicCount, privateCount, note) {
  const publicCountSafe = Number.isFinite(publicCount) ? publicCount : 0;
  const hasPrivate = Number.isFinite(privateCount);
  const privateCountSafe = hasPrivate ? privateCount : 0;
  const total = publicCountSafe + privateCountSafe;

  const W = 480, H = 300, cx = 160, cy = 140, R = 78, SW = 44;
  const C = 2 * Math.PI * R;

  const pubFrac = total > 0 ? publicCountSafe / total : 1;
  const privFrac = hasPrivate && total > 0 ? privateCountSafe / total : 0;

  const pubDash = `${(pubFrac * C).toFixed(2)} ${C.toFixed(2)}`;
  const privDash = `${(privFrac * C).toFixed(2)} ${C.toFixed(2)}`;
  const privRotate = pubFrac * 360;

  const legendX = 300;
  const legend = (y, color, label, value, pct) => `
    <circle cx="${legendX - 10}" cy="${y}" r="7" fill="${color}"/>
    <text x="${legendX}" y="${y + 5}" fill="#c8d3f5" font-size="16" font-family="Segoe UI, Arial, sans-serif">${label}</text>
    <text x="${legendX + 150}" y="${y + 5}" fill="#ffffff" font-size="16" font-weight="bold" font-family="Segoe UI, Arial, sans-serif" text-anchor="end">${value} (${pct}%)</text>`;

  const privateLegend = hasPrivate
    ? legend(120, "#fbbf24", "Private", privateCountSafe, total ? ((privFrac * 100).toFixed(1)) : "0.0")
    : `<text x="${legendX}" y="125" fill="#fbbf24" font-size="13" font-family="Segoe UI, Arial, sans-serif">Private: add GH_TOKEN to reveal</text>`;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="#0d1117" rx="14"/>
  <text x="${W / 2}" y="36" fill="#c8d3f5" font-size="20" font-weight="bold" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">Repository Breakdown — ${OWNER}</text>

  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#1f2430" stroke-width="${SW}"/>
  <circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#38bdf8" stroke-width="${SW}" stroke-dasharray="${pubDash}" transform="rotate(-90 ${cx} ${cy})" stroke-linecap="butt"/>
  ${hasPrivate ? `<circle cx="${cx}" cy="${cy}" r="${R}" fill="none" stroke="#fbbf24" stroke-width="${SW}" stroke-dasharray="${privDash}" transform="rotate(${-90 + privRotate} ${cx} ${cy})" stroke-linecap="butt"/>` : ""}

  <text x="${cx}" y="${cy + 2}" fill="#ffffff" font-size="34" font-weight="bold" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">${total}</text>
  <text x="${cx}" y="${cy + 24}" fill="#8b949e" font-size="13" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">total repos</text>

  ${legend(78, "#38bdf8", "Public", publicCountSafe, total ? ((pubFrac * 100).toFixed(1)) : "100.0")}
  ${privateLegend}
  ${note ? `<text x="${W / 2}" y="282" fill="#8b949e" font-size="12" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">${note}</text>` : ""}
</svg>`;
}

async function main() {
  let publicCount = 0;
  let privateCount = NaN;

  try {
    const profile = await json(`https://api.github.com/users/${OWNER}`);
    publicCount = profile.public_repos ?? 0;
  } catch (err) {
    console.warn("Could not fetch public repo count:", err.message);
  }

  // Only a real user token (not the bot GITHUB_TOKEN) can read private counts.
  const realToken = process.env.GH_TOKEN;
  if (realToken) {
    try {
      const me = await json("https://api.github.com/user");
      if (me.total_private_repos != null) privateCount = me.total_private_repos;
    } catch (err) {
      console.warn("Could not fetch private repo count:", err.message);
    }
  }

  const note = Number.isFinite(privateCount)
    ? "Auto-generated — includes private repos, refreshed every 6 hours"
    : "Private count hidden — add a GH_TOKEN secret (PAT with repo scope) to include private repos";

  mkdirSync(outDir, { recursive: true });
  writeFileSync(outFile, svg(publicCount, privateCount, note));
  console.log(`Wrote ${outFile} (public=${publicCount}, private=${Number.isFinite(privateCount) ? privateCount : "n/a"})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
