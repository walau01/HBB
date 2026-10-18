// Downloads the self-hosted fonts into public/fonts.
// Latin fonts are saved as Google's "latin" subset. Chinese display fonts are
// subset to the characters the site actually uses, so rerun this script after
// adding Chinese headings, titles or interface copy:  pnpm fonts
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const outDir = path.join(root, "public/fonts");
const UA =
  "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

// file: output name · family/axes: Google Fonts css2 query · cjk: subset by text
const fonts = [
  { file: "anton-latin.woff2", family: "Anton" },
  { file: "archivo-latin.woff2", family: "Archivo:wght@400..800" },
  { file: "ibm-plex-mono-400-latin.woff2", family: "IBM Plex Mono:wght@400" },
  { file: "ibm-plex-mono-600-latin.woff2", family: "IBM Plex Mono:wght@600" },
  {
    file: "noto-serif-sc-900-subset.woff2",
    family: "Noto Serif SC:wght@900",
    cjk: true,
  },
];

const licences = {
  "Anton-OFL.txt": "anton",
  "Archivo-OFL.txt": "archivo",
  "IBM-Plex-Mono-OFL.txt": "ibmplexmono",
  "Noto-Serif-SC-OFL.txt": "notoserifsc",
};

// Every Chinese string that can be set in a display font: interface copy,
// menus, topic names, and article titles and headings.
function displayText() {
  const files = [
    "src/i18n/zh.json",
    "src/config/menu.zh.json",
    ...fs
      .readdirSync(path.join(root, "src/content"), { recursive: true })
      .filter((f) => f.includes("simplified-chinese") && /\.mdx?$/.test(f))
      .map((f) => path.join("src/content", f)),
  ];
  const ascii = Array.from({ length: 95 }, (_, i) =>
    String.fromCharCode(32 + i),
  ).join("");
  let text = ascii + "，。、：；？！「」『』（）《》〈〉…—·￥％";
  for (const file of files) {
    const src = fs.readFileSync(path.join(root, file), "utf8");
    text += file.endsWith(".json")
      ? src
      : src
          .split("\n")
          .filter((l) => /^(title|description|takeaway):|^#{1,6}\s/.test(l))
          .join("\n");
  }
  return [...new Set(text.replace(/\s/g, ""))].sort().join("");
}

async function css(family, text) {
  const q = new URLSearchParams({ family, display: "swap" });
  if (text) q.set("text", text);
  const res = await fetch(`https://fonts.googleapis.com/css2?${q}`, {
    headers: { "User-Agent": UA },
  });
  if (!res.ok) throw new Error(`${family}: ${res.status}`);
  return res.text();
}

async function download(url, file) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${file}: ${res.status}`);
  fs.writeFileSync(
    path.join(outDir, file),
    Buffer.from(await res.arrayBuffer()),
  );
  console.log(`✅ ${file}`);
}

fs.mkdirSync(outDir, { recursive: true });
const chars = displayText();
for (const font of fonts) {
  const sheet = await css(font.family, font.cjk ? chars : undefined);
  // Use the block Google labels "latin"; a text= request returns a single block.
  const block = font.cjk ? sheet : sheet.split("/* latin */")[1] || sheet;
  const url = block.match(/url\((https:[^)]+)\)/)?.[1];
  if (!url) throw new Error(`${font.family}: no font url`);
  await download(url, font.file);
}
for (const [file, dir] of Object.entries(licences)) {
  const res = await fetch(
    `https://raw.githubusercontent.com/google/fonts/main/ofl/${dir}/OFL.txt`,
  );
  if (res.ok) fs.writeFileSync(path.join(outDir, file), await res.text());
}
console.log(`Chinese display subset: ${chars.length} characters`);
