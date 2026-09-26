import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";

const root = process.cwd();
const languages = JSON.parse(
  fs.readFileSync(path.join(root, "src/config/language.json"), "utf8"),
);
const blogRoot = path.join(root, "src/content/blog");

const postsByLanguage = new Map();

for (const language of languages) {
  const directory = path.join(blogRoot, language.contentDir);
  const posts = new Map();

  if (!fs.existsSync(directory)) {
    console.error(
      `Translation validation failed: missing blog directory ${path.relative(root, directory)}`,
    );
    process.exit(1);
  }

  for (const filename of fs.readdirSync(directory)) {
    if (
      filename.startsWith("-") ||
      (!filename.endsWith(".md") && !filename.endsWith(".mdx"))
    ) {
      continue;
    }

    const filePath = path.join(directory, filename);
    if (!fs.statSync(filePath).isFile()) continue;

    const { data } = matter(fs.readFileSync(filePath, "utf8"));
    posts.set(filename, data);
  }

  postsByLanguage.set(language.languageCode, posts);
}

const filenames = new Set(
  [...postsByLanguage.values()].flatMap((posts) => [...posts.keys()]),
);
const errors = [];
const notices = [];

for (const filename of [...filenames].sort()) {
  const versions = languages.map((language) => ({
    language,
    data: postsByLanguage.get(language.languageCode)?.get(filename),
  }));

  const availableVersions = versions.filter(({ data }) => data);
  const missingLanguages = versions
    .filter(({ data }) => !data)
    .map(({ language }) => language.languageName);

  if (missingLanguages.length > 0) {
    notices.push(
      `${filename}: not yet available in ${missingLanguages.join(", ")}`,
    );
  }

  const publishedVersions = availableVersions.filter(({ data }) => !data.draft);
  if (
    publishedVersions.length > 0 &&
    publishedVersions.length < availableVersions.length
  ) {
    errors.push(
      `${filename}: draft status must match across available translations`,
    );
  }

  const dates = new Set(
    availableVersions.map(({ data }) =>
      data.date ? new Date(data.date).toISOString() : "missing",
    ),
  );
  if (dates.size > 1) {
    errors.push(
      `${filename}: publication date must match across available translations`,
    );
  }
}

if (errors.length > 0) {
  console.error("Translation validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

if (notices.length > 0) {
  console.warn("Translation notices:\n");
  for (const notice of notices) console.warn(`- ${notice}`);
  console.warn("");
}

console.log(
  `Translation validation passed for ${filenames.size} article${filenames.size === 1 ? "" : "s"}.`,
);
