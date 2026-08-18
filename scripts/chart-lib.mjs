// Shared helpers for the profile chart generators (charts/*.svg).
// All charts use the same dark card style so the profile looks cohesive.

export const esc = (s) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

export const fmt = (n) => (Number.isFinite(n) ? n.toLocaleString("en-US") : "—");

export function fetchJson(url, token, accept = "application/vnd.github+json") {
  const headers = { Accept: accept, "User-Agent": "profile-readme" };
  if (token) headers.Authorization = `Bearer ${token}`;
  return fetch(url, { headers }).then((res) => {
    if (!res.ok) throw new Error(`GET ${url} -> ${res.status}`);
    return res.json();
  });
}

// All repos visible to the token (public always; private when GH_TOKEN is set).
export async function paginateRepos(owner, token) {
  const all = [];
  let page = 1;
  for (;;) {
    const batch = await fetchJson(
      `https://api.github.com/users/${owner}/repos?per_page=100&page=${page}&sort=updated`,
      token
    );
    all.push(...batch);
    if (batch.length < 100) break;
    page += 1;
  }
  return all;
}

export function svgCard({ width, height, title, body, footer }) {
  const footerSvg = footer
    ? `<text x="${width / 2}" y="${height - 13}" fill="#8b949e" font-size="12" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">${esc(footer)}</text>`
    : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="${width}" height="${height}" fill="#0d1117" rx="14"/>
  <text x="${width / 2}" y="34" fill="#c8d3f5" font-size="19" font-weight="bold" font-family="Segoe UI, Arial, sans-serif" text-anchor="middle">${esc(title)}</text>
  ${body}
  ${footerSvg}
</svg>`;
}

// Vertical list of { icon, label, value } rows with right-aligned values.
export function statRows(items, { x = 24, y0 = 58, rowH = 30, width = 460, valueColor = "#ffffff" }) {
  return items
    .map((item, i) => {
      const y = y0 + i * rowH;
      return `<text x="${x}" y="${y + 12}" font-size="17" font-family="Segoe UI, Arial, sans-serif">${item.icon}</text>
  <text x="${x + 32}" y="${y + 13}" fill="#c8d3f5" font-size="15" font-family="Segoe UI, Arial, sans-serif">${esc(item.label)}</text>
  <text x="${width - 24}" y="${y + 13}" fill="${valueColor}" font-size="15" font-weight="bold" font-family="Segoe UI, Arial, sans-serif" text-anchor="end">${esc(item.value)}</text>`;
    })
    .join("\n  ");
}

// Horizontal bar rows for language/usage charts.
export function barRows(items, { x = 24, y0 = 58, rowH = 32, width = 460, barW = 240 }) {
  return items
    .map((item, i) => {
      const y = y0 + i * rowH;
      const pct = Math.round(item.pct * 1000) / 10;
      const fill = Math.max(0, Math.min(1, item.pct));
      return `<circle cx="${x + 6}" cy="${y + 9}" r="6" fill="${item.color}"/>
  <text x="${x + 22}" y="${y + 13}" fill="#c8d3f5" font-size="14" font-family="Segoe UI, Arial, sans-serif">${esc(item.label)}</text>
  <rect x="${x + 110}" y="${y - 2}" width="${barW}" height="12" rx="6" fill="#1f2430"/>
  <rect x="${x + 110}" y="${y - 2}" width="${Math.round(barW * fill)}" height="12" rx="6" fill="${item.color}"/>
  <text x="${x + 110 + barW + 12}" y="${y + 7}" fill="#ffffff" font-size="13" font-weight="bold" font-family="Segoe UI, Arial, sans-serif">${pct}%</text>`;
    })
    .join("\n  ");
}
