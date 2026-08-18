// Generates charts/featured.svg — the most recently updated repos.
// Replaces the github-profile-trophy.vercel.app image (whose deployment was
// disabled), with something genuinely useful: a "latest projects" spotlight.
//
// Usage: node scripts/featured.mjs
// Env:   OWNER (required), GH_TOKEN (optional), GITHUB_TOKEN (fallback)

import { writeFileSync } from "node:fs";
import { esc, fmt, fetchJson, paginateRepos, svgCard } from "./chart-lib.mjs";

const OWNER = process.env.OWNER || "temidayoxyz";
const TOKEN = process.env.GH_TOKEN || process.env.GITHUB_TOKEN || "";
const COUNT = 4;

const LANG_COLORS = {
  HTML: "#e34c26", CSS: "#563d7c", JavaScript: "#f1e05a", TypeScript: "#3178c6",
  Python: "#3572A5", Go: "#00ADD8", Rust: "#dea584", Java: "#b07219",
  PHP: "#4F5D95", Ruby: "#701516", Shell: "#89e051", SCSS: "#c6538c", Vue: "#41b883",
  Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB", "C++": "#f34b7d", C: "#555555",
  "Jupyter Notebook": "#DA5B0B", Dockerfile: "#384d54", Markdown: "#083fa1",
};
const FALLBACK = "#38bdf8";

function repoRow(repo, i, y, width) {
  const lang = repo.language || "";
  const color = (LANG_COLORS[lang] || FALLBACK);
  const desc = (repo.description || "No description").slice(0, 62);
  const date = (repo.pushed_at || "").slice(0, 10);

  let line = `<text x="24" y="${y + 4}" fill="#38bdf8" font-size="15" font-weight="bold" font-family="Segoe UI, Arial, sans-serif">${esc(repo.name)}</text>`;
  if (repo.stargazers_count > 0 || repo.forks_count > 0) {
    const extra = `${repo.stargazers_count > 0 ? `⭐ ${repo.stargazers_count}` : ""}${repo.stargazers_count > 0 && repo.forks_count > 0 ? "  " : ""}${repo.forks_count > 0 ? `🍴 ${repo.forks_count}` : ""}`;
    line += `<text x="${width - 24}" y="${y + 4}" fill="#c8d3f5" font-size="13" font-family="Segoe UI, Arial, sans-serif" text-anchor="end">${esc(extra)}</text>`;
  }
  line += `<text x="24" y="${y + 24}" fill="#8b949e" font-size="13" font-family="Segoe UI, Arial, sans-serif">${esc(desc)}</text>`;
  if (lang) {
    line += `<circle cx="24" cy="${y + 41}" r="4" fill="${color}"/>
  <text x="34" y="${y + 45}" fill="#8b949e" font-size="12" font-family="Segoe UI, Arial, sans-serif">${esc(lang)}</text>`;
  }
  line += `<text x="${width - 24}" y="${y + 45}" fill="#6e7681" font-size="12" font-family="Segoe UI, Arial, sans-serif" text-anchor="end">updated ${date}</text>`;
  return line;
}

async function main() {
  const repos = await paginateRepos(OWNER, TOKEN);
  const featured = repos
    .filter((r) => !r.fork)
    .sort((a, b) => (b.pushed_at || "").localeCompare(a.pushed_at || ""))
    .slice(0, COUNT);

  const body = featured.map((repo, i) => repoRow(repo, i, 58 + i * 62, 460)).join("\n  ");

  const svg = svgCard({
    width: 460,
    height: 58 + featured.length * 62 + 30,
    title: "Latest Projects",
    body,
    footer: "Most recently updated repos — refreshed every 6 hours",
  });

  writeFileSync("charts/featured.svg", svg);
  console.log(`Wrote charts/featured.svg (${featured.length} repos)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
