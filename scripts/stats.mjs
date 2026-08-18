// Generates charts/stats.svg — a self-contained GitHub stats card.
// Replaces the github-readme-stats.vercel.app image (which was down).
// Also fills the repo-count marker (<!--REPO_COUNT-->) in README.md with the
// live public repo count.
//
// Usage: node scripts/stats.mjs
// Env:   OWNER (required), GITHUB_TOKEN (automatic in Actions)

import { readFileSync, writeFileSync } from "node:fs";
import { esc, fmt, fetchJson, paginateRepos, svgCard, statRows } from "./chart-lib.mjs";

const OWNER = process.env.OWNER || "temidayoxyz";
const TOKEN = process.env.GITHUB_TOKEN || "";
const README = "README.md";

async function searchCount(query) {
  try {
    const url = `https://api.github.com/search/issues?q=${encodeURIComponent(query)}&per_page=1`;
    const data = await fetchJson(url, TOKEN);
    return data.total_count ?? 0;
  } catch (err) {
    console.warn(`Search failed for ${query}:`, err.message);
    return null;
  }
}

async function commitCount() {
  try {
    const url = `https://api.github.com/search/commits?q=${encodeURIComponent(`author:${OWNER}`)}&per_page=1`;
    const data = await fetchJson(url, TOKEN, "application/vnd.github.cloak-preview+json");
    return data.total_count ?? 0;
  } catch (err) {
    console.warn("Commit search failed:", err.message);
    return null;
  }
}

async function main() {
  const profile = await fetchJson(`https://api.github.com/users/${OWNER}`, TOKEN);
  const repos = await paginateRepos(OWNER, TOKEN);

  const stars = repos.reduce((sum, r) => sum + (r.stargazers_count || 0), 0);
  const forks = repos.reduce((sum, r) => sum + (r.forks_count || 0), 0);
  const totalRepos = profile.public_repos ?? repos.length;

  const [prs, issues, commits] = await Promise.all([
    searchCount(`type:pr author:${OWNER}`),
    searchCount(`type:issue author:${OWNER}`),
    commitCount(),
  ]);

  const rows = [
    { icon: "👥", label: "Followers", value: fmt(profile.followers) },
    { icon: "📦", label: "Repositories", value: fmt(totalRepos) },
    { icon: "⭐", label: "Stars earned", value: fmt(stars) },
    { icon: "🍴", label: "Forks", value: fmt(forks) },
    { icon: "🔀", label: "Pull requests", value: fmt(prs) },
    { icon: "🐛", label: "Issues opened", value: fmt(issues) },
    { icon: "✅", label: "Commits", value: fmt(commits) },
  ];

  const footer = "Auto-generated — refreshed every 6 hours";

  const svg = svgCard({
    width: 460,
    height: 70 + rows.length * 30 + 30,
    title: `${OWNER} — GitHub Stats`,
    body: statRows(rows, { width: 460 }),
    footer,
  });

  writeFileSync("charts/stats.svg", svg);
  console.log(`Wrote charts/stats.svg (repos=${totalRepos}, stars=${stars}, commits=${commits})`);

  // Fill the repo-count marker in the About Me section with the live count.
  // The HTML-comment markers persist after replacement, so future runs can
  // update it again.
  try {
    const readme = readFileSync(README, "utf8");
    const updated = readme.replace(
      /<!--REPO_COUNT-->([^<]*)<!--REPO_COUNT-->/,
      `<!--REPO_COUNT-->${fmt(totalRepos)}<!--REPO_COUNT-->`
    );
    if (updated !== readme) {
      writeFileSync(README, updated);
      console.log(`Updated repo count in ${README} -> ${fmt(totalRepos)}`);
    }
  } catch (err) {
    console.warn("Could not update repo count in README:", err.message);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
