import mdx from "@astrojs/mdx";
import react from "@astrojs/react";
import sitemap from "@astrojs/sitemap";
import tailwindcss from "@tailwindcss/vite";
import AutoImport from "astro-auto-import";
import { defineConfig } from "astro/config";
import remarkCollapse from "remark-collapse";
import remarkToc from "remark-toc";
import sharp from "sharp";
import config from "./src/config/config.json";
import languagesJSON from "./src/config/language.json";
import { readFile } from "node:fs/promises";
import { parse } from "node-html-parser";

const { default_language } = config.settings;

const supportedLang = [...languagesJSON.map((lang) => lang.languageCode)];
const disabledLanguages = config.settings.disable_languages;
let buildOutputDir;
const sitemapPageMetadata = {
  name: "walau01-sitemap-page-metadata",
  hooks: {
    "astro:config:done": ({ config }) => {
      buildOutputDir = config.outDir;
    },
  },
};

// Filter out disabled languages from supportedLang
const filteredSupportedLang = supportedLang.filter(
  (lang) => !disabledLanguages.includes(lang),
);

// The approved journal fonts are self-hosted in public/fonts and declared in journal.css.
// https://astro.build/config
export default defineConfig({
  site: config.site.base_url ? config.site.base_url : "http://examplesite.com",
  base: config.site.base_path ? config.site.base_path : "/",
  trailingSlash: config.site.trailing_slash ? "always" : "ignore",
  vite: { plugins: [tailwindcss()] },
  i18n: { locales: filteredSupportedLang, defaultLocale: default_language },
  image: { service: sharp() },
  integrations: [
    react(),
    sitemapPageMetadata,
    sitemap({
      async serialize(item) {
        // Use the rendered page's indexing policy and canonical URL as the source of truth.
        const pathname = new URL(item.url).pathname.replace(/^\/|\/$/g, "");
        const file = new URL(
          pathname ? `${pathname}/index.html` : "index.html",
          buildOutputDir,
        );
        const head = parse(await readFile(file, "utf8")).querySelector("head");
        const robots =
          head?.querySelector('meta[name="robots"]')?.getAttribute("content") ||
          "";
        if (/\bnoindex\b/i.test(robots)) return undefined;
        const canonical = head
          ?.querySelector('link[rel="canonical"]')
          ?.getAttribute("href");
        if (
          canonical &&
          canonical.replace(/\/$/, "") !== item.url.replace(/\/$/, "")
        )
          return undefined;
        return canonical ? { ...item, url: canonical } : item;
      },
    }),
    AutoImport({
      imports: [
        "@/shortcodes/Button",
        "@/shortcodes/Accordion",
        "@/shortcodes/Notice",
        "@/shortcodes/Video",
        "@/shortcodes/Youtube",
        "@/shortcodes/Tabs",
        "@/shortcodes/Tab",
      ],
    }),
    mdx(),
  ],
  markdown: {
    remarkPlugins: [remarkToc, [remarkCollapse, { test: "Table of contents" }]],
    shikiConfig: { theme: "one-dark-pro", wrap: true },
  },
});
