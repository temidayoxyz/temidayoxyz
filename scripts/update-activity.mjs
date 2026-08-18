// Renders the user's recent public activity into the README section between
// the <!--RECENT_ACTIVITY:start--> and <!--RECENT_ACTIVITY:end--> markers.
// Includes pushes, PRs, issues, stars, forks and releases — the things the
// stock "activity" actions often filter out.
//
// Usage: node scripts/update-activity.mjs
// Env:   OWNER (required), GITHUB_TOKEN (required), MAX_LINES (optional, default 8)

import { readFileSync, writeFileSync } from "node:fs";

const OWNER = process.env.OWNER || "temidayoxyz";
const TOKEN = process.env.GITHUB_TOKEN || "";
const MAX_LINES = parseInt(process.env.MAX_LINES || "8", 10);
const README = "README.md";
const SECTION_START = "<!--RECENT_ACTIVITY:start-->";
const SECTION_END = "<!--RECENT_ACTIVITY:end-->";
const PROFILE_REPO = `${OWNER}/${OWNER}`; // self-updating README noise, skip it

const cap = (s) => (s ? s[0].toUpperCase() + s.slice(1) : s);
const dateOf = (iso) =>
  new Date(iso).toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
const repoLink = (name) => `[${name}](https://github.com/${name})`;

function render(event) {
  const { type, repo, payload, created_at } = event;
  const link = repoLink(repo.name);
  const date = dateOf(created_at);
  const line = (emoji, text) => `- ${emoji} ${text} — ${date}`;

  switch (type) {
    case "PushEvent": {
      const n = payload.commits?.length ?? 0;
      const count = n > 0 ? ` ${n} commit${n > 1 ? "s" : ""}` : "";
      const branch = (payload.ref || "").replace("refs/heads/", "");
      return line("🚀", `Pushed${count} to ${link}${branch ? ` on \`${branch}\`` : ""}`);
    }
    case "CreateEvent": {
      const what =
        payload.ref_type === "repository"
          ? "Created repository"
          : `Created ${payload.ref_type} \`${payload.ref}\` in`;
      return line("🌱", `${what} ${link}`);
    }
    case "DeleteEvent":
      return line("🗑️", `Deleted ${payload.ref_type} \`${payload.ref}\` in ${link}`);
    case "PullRequestEvent":
      return line(
        "🔀",
        `${cap(payload.action)} PR [#${payload.pull_request.number}](${payload.pull_request.html_url}) in ${link}`
      );
    case "PullRequestReviewEvent":
      return line(
        "👀",
        `Reviewed PR [#${payload.pull_request.number}](${payload.pull_request.html_url}) in ${link}`
      );
    case "IssuesEvent":
      return line(
        "🐛",
        `${cap(payload.action)} issue [#${payload.issue.number}](${payload.issue.html_url}) in ${link}`
      );
    case "IssueCommentEvent":
      return line(
        "💬",
        `Commented on [issue #${payload.issue.number}](${payload.issue.html_url}) in ${link}`
      );
    case "WatchEvent":
      return line("⭐", `Starred ${link}`);
    case "ForkEvent":
      return line("🍴", `Forked ${link}`);
    case "ReleaseEvent":
      return line("📦", `Released [${payload.release.tag_name}](${payload.release.html_url}) in ${link}`);
    default:
      return null; // unsupported event types are skipped
  }
}

async function main() {
  let events = [];
  try {
    const res = await fetch(`https://api.github.com/users/${OWNER}/events?per_page=100`, {
      headers: { Authorization: `Bearer ${TOKEN}`, Accept: "application/vnd.github+json" },
    });
    if (!res.ok) throw new Error(`events API -> ${res.status}`);
    events = await res.json();
  } catch (err) {
    console.warn("Could not fetch events:", err.message);
  }

  const seen = new Set();
  const lines = [];
  for (const event of events) {
    if (event.repo?.name === PROFILE_REPO) continue; // don't log our own README churn
    if (seen.has(event.id)) continue; // events API can return duplicates
    seen.add(event.id);
    const rendered = render(event);
    if (rendered) {
      lines.push(rendered);
      if (lines.length >= MAX_LINES) break;
    }
  }

  const body =
    lines.length > 0
      ? lines.join("\n")
      : "> No recent public activity yet — pushes, PRs and stars will show up here.";

  const readme = readFileSync(README, "utf8");
  const start = readme.indexOf(SECTION_START);
  const end = readme.indexOf(SECTION_END);
  if (start === -1 || end === -1 || end < start) {
    console.warn(`Markers ${SECTION_START} / ${SECTION_END} not found in ${README}; skipping.`);
    process.exit(0);
  }

  const updated =
    readme.slice(0, start + SECTION_START.length) +
    "\n" +
    body +
    "\n" +
    readme.slice(end);
  writeFileSync(README, updated);
  console.log(`Updated activity log with ${lines.length} entr${lines.length === 1 ? "y" : "ies"}.`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
