// Generates charts/techstack.svg — a row of real brand logos with labels,
// built from the simple-icons SVGs committed in assets/icons/.
// Replaces the skillicons.dev image (third-party service).
//
// Usage: node scripts/techstack.mjs
// Env:   none (reads assets/icons/*.svg)

import { readFileSync, writeFileSync } from "node:fs";
import { esc, svgCard } from "./chart-lib.mjs";

const ICONS = [
  { slug: "html5", label: "HTML5", color: "#E34F26" },
  { slug: "css3", label: "CSS3", color: "#1572B6" },
  { slug: "javascript", label: "JavaScript", color: "#F7DF1E" },
  { slug: "typescript", label: "TypeScript", color: "#3178C6" },
  { slug: "react", label: "React", color: "#61DAFB" },
  { slug: "nodedotjs", label: "Node.js", color: "#5FA04E" },
  { slug: "python", label: "Python", color: "#3776AB" },
  { slug: "git", label: "Git", color: "#F05032" },
  { slug: "github", label: "GitHub", color: "#e6edf3" },
  { slug: "visualstudiocode", label: "VS Code", color: "#007ACC" },
  { slug: "linux", label: "Linux", color: "#FCC624" },
];

const SIZE = 40;
const GAP = 20;
const ROWS = [ICONS.slice(0, 6), ICONS.slice(6)];

function loadPaths() {
  const paths = {};
  for (const { slug } of ICONS) {
    const svg = readFileSync(`assets/icons/${slug}.svg`, "utf8");
    const m = svg.match(/<path d="([^"]+)"/);
    if (!m) throw new Error(`No path found in assets/icons/${slug}.svg`);
    paths[slug] = m[1];
  }
  return paths;
}

function rowSvg(row, y) {
  const rowW = row.length * SIZE + (row.length - 1) * GAP;
  let x = (460 - rowW) / 2;
  return row
    .map(({ slug, label, color }) => {
      const icon = `<svg x="${x.toFixed(1)}" y="${y}" width="${SIZE}" height="${SIZE}" viewBox="0 0 24 24"><path d="${paths[slug]}" fill="${color}"/></svg>`;
      const text = `<text x="${(x + SIZE / 2).toFixed(1)}" y="${y + SIZE + 14}" fill="#c8d3f5" font-size="11" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">${esc(label)}</text>`;
      x += SIZE + GAP;
      return `${icon}\n  ${text}`;
    })
    .join("\n  ");
}

const paths = loadPaths();
const body = `${rowSvg(ROWS[0], 58)}\n  ${rowSvg(ROWS[1], 124)}`;

const svg = svgCard({
  width: 460,
  height: 214,
  title: "Tech Stack",
  body,
  footer: "Brand logos from simple-icons (CC0) — baked into this repo, no external service",
});

writeFileSync("charts/techstack.svg", svg);
console.log(`Wrote charts/techstack.svg (${ICONS.length} icons)`);
