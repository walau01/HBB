# walau01 redesign — design spec

**Direction:** Kopitiam signboard + Penang shop row + Hong Kong / Japan neon at night.
**Status:** agreed design, before build. Home page has an interactive mockup; every other page is specified here only.

---

## 1. Decisions so far

| Item | Decision |
|---|---|
| Brand in hero | Giant **WALAU01** (same in both languages) |
| Tagline | **Rational finance and side thoughts.** / **理性理财，偶尔跑题。** |
| Shops (topics) | **Investing 101 / 投资101** · **Beneath the Surface / 水面之下** · **FIRE / FIRE 财务自由** · **Off the Clock / 下班以后** |
| Empty shops | Hidden until the first article is published (FIRE is hidden at launch → 3 shops show) |
| Fine-grained subjects | Tags (e.g. ETF, compounding, FIRE, long-term, AI, side project) — no new shop for one-off topics |
| Shop row | Signs only, hanging directly **under one continuous scalloped awning**, small gaps (~12px). No shopfronts, no light switches, no "opening soon" unit |
| Night mode | Signs and key headings turn to neon; signs light up one by one, left to right, when Night is switched on |
| Order chit heading | **Can't decide? Start here** / **选择困难？从这里开始** (fixed, not random) |
| Stamp text | **RATIONAL FINANCE · SIDE THOUGHTS** / **理性理财 · 偶尔跑题** |
| Hero buttons | **Explore Topics / 探索主题** · **About the author / 关于作者** |
| Bilingual rule | English pages show only English; 中文 pages show only Chinese. Only the brand "WALAU01" is shared |
| Chinese style | Plain, standard Simplified Chinese (readable in MY / SG / CN). Local flavour lives in the articles, not the UI |
| Calculator | None for now (removed in commit `36b97de`; recoverable from git history later) |

---

## 2. Design system

### 2.1 Colour

| Token | Day | Night | Use |
|---|---|---|---|
| Page | `#F5E9D2` cream plaster | `#0D0B0A` warm black | Background |
| Ink | `#1C1712` | `#F3E6CF` | Body text |
| Ink soft | `#4E4538` | `#B9AC96` | Secondary text |
| Signboard red | `#C8261D` | `#3A0B09` (+ red neon text) | Header, footer, primary buttons |
| Red dark | `#9E1B14` | `#240605` | Header border, footer strip |
| Mustard | `#F2B705` | gold neon `#FFE9A8` glow | Highlights, stamp, menu prices |
| Kopi green | `#0F3D2E` | `#081A13` | Menu board, labels, banner |
| Paper | `#FFFDF7` | `#EFE4CB` (lamp-lit) | Order chit, receipts |

Neon glows are layered `text-shadow` / `box-shadow` (white core → coloured halo). All text keeps at least 4.5:1 contrast with its background in both themes; glow is decoration only.

### 2.2 Typography

| Role | English | 中文 |
|---|---|---|
| Display (WALAU01, section titles) | Anton (condensed) | Noto Serif SC 900 |
| Body / UI | Archivo 400–800 | system Chinese sans (PingFang / Noto Sans SC) |
| Receipts, codes, read times | IBM Plex Mono | IBM Plex Mono for numbers, system sans for Chinese |
| Sign lettering | per sign (see 3.4) | per sign (see 3.4) |

Chinese display fonts must be **subset to the characters actually used** (signs, headings) and self-hosted, to keep pages fast.

### 2.3 Motion

| Animation | Where | Notes |
|---|---|---|
| Flicker-on | Each neon sign, WALAU01, logo | Plays once when Night turns on; signs staggered ~0.25s left → right |
| Neon hum | Lit neon | Rare, subtle dip every ~7s |
| Wave ripple + bubbles | Beneath the Surface sign | Night only |
| Flame flicker | FIRE sign | Night only, two-tone |
| Bulb chase + steam/fizz | Off the Clock sign | Night only |
| Question banner scroll | Green banner | Slow, GPU `transform` only, pauses on hover |

Everything stops for visitors with **reduced motion** turned on (they see the lit, still state). No animation is needed to understand the page.

### 2.4 Shared components

| Component | Description |
|---|---|
| **Header** | Red signboard band: WALAU01 logo, menu, search button, Day/Night pill (mustard), EN/中文 toggle. Night: logo red neon, "01" gold neon |
| **Footer** | Scalloped top edge, tagline line, links (Articles, Start here, About, Privacy policy), giant outlined WALAU01 (pink neon outline at night), disclaimer strip |
| **Awning** | Cornice → rod → striped awning with scalloped valance; each shop's segment in its own colours; one continuous strip |
| **Signboard** | One component with 4 variants (3.4). Sizes: L (home row), M (shop page hero), S (badge on cards/menus) |
| **Order chit** | Tilted paper receipt with dashed rules, zig-zag bottom edge, barcode, dark button |
| **Stamp** | Round mustard stamp, circular text, "?!" in the middle |
| **Menu board** | Kopi-green board, double inner frame, title, items with code · title · dotted leader · read time |
| **Question banner** | Tilted green band of article questions, separated by ✦ |
| **Shutter** | Grey roller shutter with a paper notice — used only on the 404 page |
| **Tag** | Small paper price-tag shape with a string hole; text = tag name |
| **Buttons** | Primary: red block + hard black offset shadow. Secondary: 3px ink outline |

---

## 3. Home page

Order top → bottom:

### 3.1 Header
As 2.4.

### 3.2 Hero
- **Left:** green label "AN INDEPENDENT INVESTING BLOG · FROM MALAYSIA"; giant **WALAU01** (red, "01" mustard); tagline on its own line — "Rational finance **and side thoughts.**" with a mustard highlight on the second half, sized to its own line so it never overlaps; intro paragraph; buttons **Explore Topics** (scrolls to the shop row) and **About the author**.
- **Right:** tilted order chit — heading **Can't decide? Start here**, three beginner articles with read times, TOTAL, button **Start reading →**. Stamp on the corner with the tagline text.
- **Night:** WALAU01 becomes giant red neon (flicker-on), highlight becomes a gold neon outline, chit looks lamp-lit.

### 3.3 Explore Topics — shop row
- Heading **Explore Topics** + one-line hint.
- Cornice, rod, continuous awning, signs hanging directly below (gap ~12px).
- Under each sign: `No. 1 · 2 ARTICLES` (mono). Shops with zero published articles are not rendered.
- Each sign is a link to its shop page.

### 3.4 The four signs

| Shop | Awning | Day | Night |
|---|---|---|---|
| **Investing 101 / 投资101** | Blue / white | Blue enamel plate, white rim, red pinstripe, rivets, tiny chips. Round white enamel badge reading **101** (like a house-number plate) next to "INVESTING" / 「投资」 | Cyan neon frame and letters, pink neon pinstripe, badge outlined in cyan |
| **Beneath the Surface / 水面之下** | Teal / white | Deep teal painted board. Name above a white wave line; below the wave a darker "underwater" strip with small bubbles | Text white-blue glow; wave is a cyan neon tube that ripples sideways; bubbles rise slowly |
| **FIRE / FIRE 财务自由** | Orange / cream | Charcoal board, unlit glass-tube flame and tall "FIRE" letters; 中文 adds 财务自由 below | Two-tone neon flame (orange outer, yellow core) flickering like a real flame; "FIRE" warm white glow |
| **Off the Clock / 下班以后** | Green / cream | Kopitiam green wooden board, bulb border, **cocktail glass** (coupe with a garnish) and a small clock at 6 o'clock | Bulbs chase, warm orange neon text, bubbles fizz up in the cocktail |

Sign lettering: Investing 101 — Alfa Slab One / Noto Serif SC 900 · Beneath the Surface — a rounded bold display / ZCOOL KuaiLe · FIRE — tall condensed (Anton) / Noto Serif SC 900 for 财务自由 · Off the Clock — Shrikhand / Ma Shan Zheng.

### 3.5 Question banner
Tilted green band listing the article questions (in the page's language). Smooth slow scroll, pauses on hover, static for reduced motion. Night: gold glow text.

### 3.6 Today's Menu
- Title **Today's Menu**; description **Every article so far, sorted by shop, with read times.**
- 2 × 2 groups, one per (visible) shop; group header = small (S) version of the shop sign.
- Item codes: **I1, I2…** (Investing 101), **B1…** (Beneath the Surface), **F1…** (FIRE), **O1…** (Off the Clock).
- Footnote while articles are drafts: "All dishes are sample drafts while the research is checked."
- Night: title gold neon.

### 3.7 About the author
Red circle "w." avatar, heading **About the author**, two-line bio, link **More about me →**.

### 3.8 Footer
As 2.4. Footer line = tagline.

### 3.9 Phone
- Header: logo + search + menu button (Day/Night and EN/中文 inside the menu).
- WALAU01 scales to the screen width; chit sits under the buttons, less tilted.
- Shop row: horizontal swipe; awning stays continuous; scroll snaps to one sign.
- Menu board: one column.

---

## 4. Shop page (`/topics/<shop>`)

One template, themed by the shop.

1. **Header.**
2. **Shop front hero:** full-width awning in the shop's colours, the shop's sign at size M centred under it, then the shop description (see copy deck) and `N articles in this shop`.
3. **Tag filter:** row of paper price tags — "All" + the tags used in this shop. Selecting a tag filters the list (works without JavaScript as plain links to tag pages).
4. **Article list — the shop's own menu card:** card background in the shop's colour family (enamel blue, deep teal, charcoal, kopitiam green). Each item: code (I1…), title, one-line description, read time with dotted leader, small tags.
5. **Other shops:** the remaining signs at size S in a mini awning row ("Next door").
6. **Footer.**

Night: hero sign lit (flicker-on), menu card text keeps normal contrast; only the sign and the card title glow.

---

## 5. Article page (`/blog/<slug>`)

Goal: the theme frames the article; the reading area stays calm.

1. **Header.**
2. **Banner:** strip of the shop's awning, then a band in the shop's colour with: small (S) shop sign + article code (e.g. B2), large title (Anton / Noto Serif SC), description, author · date · read time. A round read-time stamp ("4 MIN READ" / 「阅读 4 分钟」) on the right.
3. **Body layout (desktop):** left column = receipt-style table of contents (**In this article / 本文内容**) listing sections with numbers, TOTAL read time; right column = article (max ~700px).
4. **Top of article:** **The short version / 重点先讲** box (red block, cream text, mustard label) — the article's takeaway.
5. **Article body:** section headings in display font with red section numbers; body text in Archivo / system sans at 19px, line height 1.75; pull quotes with a big mustard quote mark; images and GIFs in a framed figure with caption; "what would change my mind" style lists as checkbox rows.
6. **Sources / 参考资料:** numbered list, links open in a new tab.
7. **Tags** as paper price tags.
8. **Disclaimer** (small, above a ruled line).
9. **Next up / 下一篇:** green ticket card with the next article in the same shop (or the next beginner step for Investing 101).
10. **Footer.**

Phone: TOC collapses into a "In this article" receipt at the top that opens/closes; banner stamp moves under the title.

Night: banner sign lit, title stays solid (no glow) for readability; body text unchanged except colours.

---

## 6. Articles page (`/blog`)

The full menu.

1. **Header.**
2. **Title:** **All articles / 所有文章** with the menu-board description.
3. **Controls:** shop filter (All + visible shops as S signs), search field ("Search the menu"), tag list.
4. **Menu board** (same component as home) — all articles, grouped by shop, newest first inside each group; shows result count and an empty state when a search finds nothing.
5. **Footer.**

Old URLs `?category=…` and `/topics/investing-basics`, `/topics/investing-questions`, `/topics/life` redirect to the new shop pages.

---

## 7. Tag pages (`/tags`, `/tags/<tag>`)

- `/tags`: wall of paper price tags hanging from a string, each with its article count.
- `/tags/<tag>`: title "Tagged: <tag>" / 「标签：<tag>」, then the menu-board list of matching articles (mixed shops, each item shows its shop badge).

---

## 8. Start here (`/start-here`)

The order chit, expanded into a page.

1. Header.
2. Big receipt centred on the page: heading **Can't decide? Start here**, intro line, the three beginner articles as numbered steps (1x, 2x, 3x) — each with title, one-line "why read this", read time and a **Read →** link. TOTAL at the bottom, barcode, stamp on the corner.
3. Under the receipt: "Then explore the shops" + the shop row (S signs).
4. Footer.

---

## 9. About (`/about`)

"Behind the counter".

1. Header.
2. Hero: large red "w." circle + **About the author**; one-paragraph bio.
3. **How I research / 我怎么做研究:** three short principles shown as three small enamel plates (Ask a real question · Go to the original evidence · Say what would change my mind).
4. Body text from the About content file.
5. Link to the shop row and to Start here.
6. Footer.

`/authors` and `/authors/walau01` keep redirecting / canonicalising to `/about`.

---

## 10. Privacy policy (`/privacy-policy`)

Plain page: header, title, prose in the article body style, footer. No signs, no neon.

---

## 11. 404

- A lone shop unit with its **roller shutter down** and a paper notice taped on it: **Walau, wrong shop.** / **WALAU，走错店了。**
- Line under it: "This page moved or never existed." / 「这一页可能搬走了，或者从来不存在。」
- Button **Back to the street / 回到街上** (home) and link to All articles.
- Night: a single street-lamp glow on the shutter.

---

## 12. Search dialog

Opened from the header (or `/` and `Ctrl/⌘ K`).

- Styled as a kopitiam order pad: paper background, dashed rules, mono labels.
- Field placeholder: "Try ETF or FIRE" / 「试试 ETF 或 FIRE」.
- Results: shop badge (S) + title + read time.
- Empty: "Nothing on the menu matches. Try another word." / 「菜单上没有相关文章，换个关键词试试。」
- Closes on Esc, click outside, or the close button.

---

## 13. Copy deck (EN / 中文)

### Global
| Key | English | 中文 |
|---|---|---|
| Nav: articles | Articles | 文章 |
| Nav: start here | Start here | 从这里开始 |
| Nav: about | About | 关于 |
| Search button | Search | 搜索 |
| Theme | Day / Night | 日间 / 夜间 |
| Tagline | Rational finance and side thoughts. | 理性理财，偶尔跑题。 |
| Eyebrow | An independent investing blog · from Malaysia | 独立投资博客 · 来自马来西亚 |
| Intro | Notes on ETFs, investing costs, and the decisions behind a portfolio. Sharing what I learn, from a Malaysian perspective. | 关于 ETF、投资成本和组合选择的研究笔记。从马来西亚投资者的角度，分享我学到的东西。 |
| Footer links | Articles · Start here · About · Privacy policy | 文章 · 从这里开始 · 关于 · 隐私政策 |
| Disclaimer | © 2026 walau01 · Personal research and reflections. General information, not individual financial advice. | © 2026 walau01 · 个人研究与观察，仅供参考，并非针对个人的财务建议。 |

### Home
| Key | English | 中文 |
|---|---|---|
| Button 1 | Explore Topics | 探索主题 |
| Button 2 | About the author | 关于作者 |
| Chit heading | Can't decide? Start here | 选择困难？从这里开始 |
| Chit subline | Table: new reader | 桌号：新读者 |
| Chit total | TOTAL · 9 MIN | 合计 · 9 分钟 |
| Chit note | No jargon needed first. | 不必先学会专业术语。 |
| Chit button | Start reading → | 开始阅读 → |
| Stamp | RATIONAL FINANCE · SIDE THOUGHTS · | 理性理财 · 偶尔跑题 · |
| Shop row title | Explore Topics | 探索主题 |
| Shop row hint | Each topic is its own shop. Walk up to the sign that matches your question. | 每个主题都是一间店。找到与你问题相符的招牌，走进去看看。 |
| Sign caption | No. 1 · 2 ARTICLES | 1 号 · 2 篇文章 |
| Menu title | Today's Menu | 今日菜单 |
| Menu description | Every article so far, sorted by shop, with read times. | 目前所有文章，按店分好，附上阅读时间。 |
| Menu footnote | All dishes are sample drafts while the research is checked. | 所有文章仍是示范草稿，研究核对中。 |
| About title | About the author | 关于作者 |
| About bio | A Malaysian investor sharing research on ETFs, portfolio decisions and investing costs. | 来自马来西亚的投资者，分享关于 ETF、投资组合决策与投资成本的研究。 |
| About link | More about me → | 更多关于我 → |

### Shops
| Shop | English description | 中文描述 |
|---|---|---|
| Investing 101 / 投资101 | How investing actually works: ETFs, compounding, risk and return, explained from zero. | 投资到底怎么运作？ETF、复利、风险与回报，从零讲起。 |
| Beneath the Surface / 水面之下 | The questions behind the headline: costs, returns, market timing, and what the evidence really says. | 标题背后的问题：成本、回报、择时，以及证据到底怎么说。 |
| FIRE / FIRE 财务自由 | How much is enough, how long it takes, and what early retirement can look like in Malaysia. | 要存多少才够？要多久？在马来西亚提早退休可以是什么样子。 |
| Off the Clock / 下班以后 | Things I build, workflows from my day job, and life outside the spreadsheet. | 我做的小东西、工作上的流程，还有表格以外的生活。 |
| Shop page count | N articles in this shop | 本店共 N 篇文章 |
| Next door | Next door | 隔壁店 |
| Tag filter: all | All | 全部 |

### Article
| Key | English | 中文 |
|---|---|---|
| TOC | In this article | 本文内容 |
| Takeaway | The short version | 重点先讲 |
| Read time stamp | 4 MIN READ | 阅读 4 分钟 |
| Sources | Sources | 参考资料 |
| Tags | Tags | 标签 |
| Next | Next up | 下一篇 |
| Back | All articles | 所有文章 |
| Disclaimer | Content on walau01.com is for information and education only. It is not professional financial advice or a personal investment recommendation. | walau01.com 的内容仅供信息交流与学习参考，并非专业财务建议，也不是针对个人的投资推荐。 |

### Other pages
| Key | English | 中文 |
|---|---|---|
| Articles title | All articles | 所有文章 |
| Search placeholder | Try ETF or FIRE | 试试 ETF 或 FIRE |
| Search empty | Nothing on the menu matches. Try another word. | 菜单上没有相关文章，换个关键词试试。 |
| Results count | N articles | 共 N 篇 |
| Tags title | Tags | 标签 |
| Tag page title | Tagged: {tag} | 标签：{tag} |
| Start here intro | Three short reads, in order. No jargon needed first. | 三篇短文，按顺序读。不必先学会专业术语。 |
| Start here after | Then explore the shops | 接着逛逛其他店 |
| Read link | Read → | 阅读 → |
| About: method title | How I research | 我怎么做研究 |
| Method 1 | Ask a real question | 先问一个真实的问题 |
| Method 2 | Go to the original evidence | 回到原始证据 |
| Method 3 | Say what would change my mind | 说清楚什么会改变我的看法 |
| 404 title | Walau, wrong shop. | WALAU，走错店了。 |
| 404 text | This page moved or never existed. | 这一页可能搬走了，或者从来不存在。 |
| 404 button | Back to the street | 回到街上 |

---

## 14. Content model and routes

| Area | Plan |
|---|---|
| Article frontmatter | `shop`: `investing-101` \| `beneath-the-surface` \| `fire` \| `off-the-clock` (replaces `journal_category`); `tags`: list; keep `title`, `description`, `takeaway`, `minutes`, `references`, `draft` |
| Shop config | One file listing each shop: id, order, door number, names (EN/中文), descriptions, sign variant, awning colours |
| Visibility | A shop renders only if it has ≥1 published article in that language |
| Item codes | Generated per shop in publish order (I1, I2…, B1…, F1…, O1…) |
| Routes | `/topics/<shop>` (new), `/blog`, `/blog/<slug>`, `/tags`, `/tags/<tag>`, `/start-here`, `/about`, `/privacy-policy`, 404; Chinese under `/zh/…` |
| Redirects | Old topic and category URLs → matching new shop page; `/ms/*` → English (already in place) |

Current articles → shops:

| Article | Shop |
|---|---|
| What does an ETF actually own? | Investing 101 |
| How does compounding grow your money? | Investing 101 |
| Are Malaysian ETFs actually bad? | Beneath the Surface |
| Should you invest when the market is at a record high? | Beneath the Surface |
| Can an investing strategy improve returns? | Beneath the Surface |
| A life worth investing for. | Off the Clock |
| (next) How much do I need to FIRE? | FIRE — shop appears once this is published |

---

## 15. Build notes

- **Framework:** Astro (current). Signs, awning, chit, stamp, menu board, banner, shutter as Astro components with SVG + CSS. No React needed; a small script handles the theme switch and the one-by-one sign lighting.
- **Theme:** `data-theme="dark"` on `<html>` (already used); neon styles and animations only apply in dark.
- **Performance:** CSS-only animations on `transform` / `opacity`; Chinese display fonts subset; no images needed for the signs.
- **Accessibility:** signs are real links with readable names ("Investing 101, 2 articles"); decorative parts `aria-hidden`; visible focus rings; reduced-motion respected; neon text keeps contrast without its glow.
- **SEO:** each page keeps its canonical, hreflang (en / zh-Hans) and structured data; the shop pages become the topic landing pages in the sitemap.

---

## 16. Open questions

1. The red goldsmith sign (% $) from the mockups has no shop now — keep it in reserve for a future shop?
2. Should the article banner show the publish date, or only read time (articles are still sample drafts)?
3. Phone header: put Day/Night outside the menu so the neon is one tap away?
