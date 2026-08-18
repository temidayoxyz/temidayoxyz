// Generates charts/languages.svg — top languages by bytes of code across
// all visible repos (public + private when GH_TOKEN is set).
// Replaces the github-readme-stats top-langs image (which was down).
//
// Usage: node scripts/languages.mjs
// Env:   OWNER (required), GITHUB_TOKEN (automatic in Actions)

import { writeFileSync } from "node:fs";
import { esc, fmt, fetchJson, paginateRepos, svgCard, barRows } from "./chart-lib.mjs";

const OWNER = process.env.OWNER || "temidayoxyz";
const TOKEN = process.env.GITHUB_TOKEN || "";
const TOP_N = 8;

const COLORS = {
  HTML: "#e34c26", CSS: "#563d7c", JavaScript: "#f1e05a", TypeScript: "#3178c6",
  Python: "#3572A5", Go: "#00ADD8", Rust: "#dea584", Java: "#b07219",
  "C++": "#f34b7d", C: "#555555", "C#": "#178600", PHP: "#4F5D95",
  Ruby: "#701516", Shell: "#89e051", SCSS: "#c6538c", Vue: "#41b883",
  Swift: "#F05138", Kotlin: "#A97BFF", Dart: "#00B4AB", "Jupyter Notebook": "#DA5B0B",
  Dockerfile: "#384d54", Makefile: "#427819", MDX: "#fcb32c", Markdown: "#083fa1",
};
const FALLBACK = ["#38bdf8", "#a78bfa", "#f472b6", "#34d399", "#fbbf24", "#fb7185", "#22d3ee", "#a3e635"];

async function main() {
  const repos = await paginateRepos(OWNER, TOKEN);
  const bytes = {};
  let seen = 0;

  // Fetch the language breakdown per repo, a few at a time to stay polite.
  for (let i = 0; i < repos.length; i += 8) {
    const batch = repos.slice(i, i + 8).map(async (repo) => {
      if (!repo.size) return;
      try {
        const langs = await fetchJson(`https://api.github.com/repos/${repo.full_name}/languages`, TOKEN);
        for (const [lang, size] of Object.entries(langs)) bytes[lang] = (bytes[lang] || 0) + size;
        seen += 1;
      } catch {
        /* skip repos we cannot read */
      }
    });
    await Promise.all(batch);
  }

  const total = Object.values(bytes).reduce((a, b) => a + b, 0);
  const top = Object.entries(bytes)
    .sort((a, b) => b[1] - a[1])
    .slice(0, TOP_N);

  const rows = top.map(([lang, size], i) => ({
    label: lang,
    color: COLORS[lang] || FALLBACK[i % FALLBACK.length],
    pct: total ? size / total : 0,
    value: `${fmt(size)}B`,
  }));

  const footer =
    total === 0
      ? "No languages detected yet"
      : `Across ${seen} repos · ${fmt(total)} bytes of code`;

  const svg = svgCard({
    width: 460,
    height: 70 + rows.length * 32 + 30,
    title: "Top Languages",
    body: barRows(rows, { width: 460, rowH: 32 }),
    footer,
  });

  writeFileSync("charts/languages.svg", svg);
  console.log(`Wrote charts/languages.svg (${top.length} languages from ${seen} repos)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
