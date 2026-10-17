# walau01

A multilingual (English, 简体中文, Bahasa Melayu) personal finance and investing blog built with Astro 6, Tailwind CSS v4 and TypeScript. Live at [walau01.com](https://walau01.com).

Originally based on the [Astroplate](https://github.com/zeon-studio/astroplate) template by Zeon Studio (MIT).

## Features

- Journal-style home, article archive with topic filters and in-page search
- Site-wide search dialog (`/` or `Ctrl/⌘ + K`)
- Light / dark theme
- Tags, categories and topic pages
- Translations validated at build time (`scripts/validateTranslations.js`)
- Sitemap that respects each page's canonical URL and `noindex`
- LLM-ready output (`llms.txt`, `llms-full.txt`, and per-page `.md`)

## Project layout

- `src/content/blog/<language>/` — articles (Markdown / MDX); one folder per language in `src/config/language.json`
- `src/content/{about,authors,pages}/` — About page, author profile, standalone pages (Start here, Privacy policy)
- `src/i18n/*.json` — interface copy for each language
- `src/layouts/journal/` — page layouts; `src/layouts/Base.astro` holds the header, footer, search and SEO tags
- `src/layouts/shortcodes/` — components auto-imported into MDX (Button, Notice, Tabs, Accordion, Video, Youtube)
- `src/config/` — site settings, menus, theme colours

## Getting started

Requires Node 22.12+ and pnpm.

```bash
pnpm install
pnpm run dev      # local dev server
pnpm run build    # validate translations, build to dist/, generate llms files
pnpm run check    # type-check
```

## LLM files

After the build, `scripts/llmsGenerator.js` generates LLM-friendly files from the HTML in `dist`:

- `llms.txt` (index of pages)
- `llms-full.txt` (full combined content)
- optional per-page Markdown files

Run it manually with `pnpm run generate-llms`. Configuration lives in `src/config/config.json` under `llms`:

- `generate_llms_txt`: create `llms.txt`
- `generate_llms_full_txt`: create `llms-full.txt`
- `generate_individual_md`: create individual `.md` files
- `include`: include only selected routes/globs (empty = all files), e.g. `/about`, `/blog/**`
- `exclude`: exclude routes/globs on top of defaults, e.g. `/blog/index.html`

## Deploying

The build is a static site in `dist/`.

```bash
pnpm run preview:cf-workers   # preview on Cloudflare Workers
pnpm run deploy:cf-workers    # deploy to Cloudflare Workers
```

Docker (served by nginx):

```bash
docker build -t walau01 .
docker run --rm -p 3000:80 walau01
```

## License

Code released under the [MIT](LICENSE) license.
