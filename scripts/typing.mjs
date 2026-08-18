// Generates charts/typing.svg — an animated "typing" banner (SMIL), fully
// self-contained. Replaces the readme-typing-svg.demolab.com image.
//
// Usage: node scripts/typing.mjs
// Env:   none

import { writeFileSync } from "node:fs";

const FONT = "Fira Code, monospace";
const SIZE = 20;
const COLOR = "#38BDF8";
const DUR = 12; // seconds for the full cycle (one line per segment)

const LINES = [
  "🌍 Just another dev on the internet",
  "🛠️ Building useful things... sometimes by accident",
  "🚀 Ridiculously cracked agentic fullstack engineer",
  "✨ Learning, shipping, repeating",
];

// Rough text width for monospace: ~0.6em per ASCII char, ~1.2em per emoji/CJK.
function textWidth(str) {
  let w = 0;
  for (const cp of [...str]) {
    if (cp === "\uFE0F") continue; // variation selector takes no width
    w += cp.codePointAt(0) > 0x2000 ? SIZE * 1.2 : SIZE * 0.6;
  }
  return w;
}

const lineW = LINES.map(textWidth);
const W = 640;
const X = 24;
const Y = 32;

const segments = LINES.map((_, i) => {
  const s = i / LINES.length;
  const e = (i + 1) / LINES.length;
  const w = lineW[i];
  const typeOn = s + 0.06; // typing reveal phase (~0.7s)
  const typeOff = e - 0.04; // fade-out phase (~0.5s)
  return {
    clip: `<clipPath id="c${i}"><rect x="${X}" y="0" width="0" height="44"><animate attributeName="width" values="0;0;${w.toFixed(1)};${w.toFixed(1)};0" keyTimes="0;${s.toFixed(3)};${typeOn.toFixed(3)};${typeOff.toFixed(3)};1" dur="${DUR}s" repeatCount="indefinite"/></rect></clipPath>`,
    // The <animate> must be a child of the group that contains the <text>,
    // otherwise it animates the root <svg> element instead of the line.
    group: `<g>
  <text x="${X}" y="${Y}" fill="${COLOR}" font-family="${FONT}" font-size="${SIZE}" clip-path="url(#c${i})">${LINES[i]}</text>
  <animate attributeName="opacity" values="0;0;1;1;0" keyTimes="0;${s.toFixed(3)};${(s + 0.02).toFixed(3)};${typeOff.toFixed(3)};1" dur="${DUR}s" repeatCount="indefinite"/>
</g>`,
  };
});

// Caret hops to the end of whichever line is active, and blinks while there.
const caretPositions = lineW.map((w) => X + w + 6);
const caretTransform = `<g>
  <animateTransform attributeName="transform" type="translate" calcMode="discrete"
    values="${caretPositions.map((p) => `${p} 0`).join(";")};${caretPositions[0]} 0"
    keyTimes="${LINES.map((_, i) => (i / LINES.length).toFixed(3)).join(";")};1"
    dur="${DUR}s" repeatCount="indefinite"/>
  <rect x="0" y="10" width="3" height="24" rx="1.5" fill="${COLOR}">
    <animate attributeName="opacity" values="1;0" keyTimes="0;0.5" dur="1s" repeatCount="indefinite"/>
  </rect>
</g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="44" viewBox="0 0 ${W} 44">
  <defs>${segments.map((s) => s.clip).join("")}</defs>
  ${segments.map((s) => s.group).join("\n  ")}
  ${caretTransform}
</svg>`;

writeFileSync("charts/typing.svg", svg);
console.log(`Wrote charts/typing.svg (${LINES.length} lines)`);
