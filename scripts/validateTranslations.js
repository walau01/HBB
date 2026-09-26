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

for (const filename of [...filenames].sort()) {
  const versions = languages.map((language) => ({
    language,
    data: postsByLanguage.get(language.languageCode)?.get(filename),
  }));

  for (const { language, data } of versions) {
    if (!data) {
      errors.push(`${filename}: missing ${language.languageName} translation`);
    }
  }

  if (versions.some(({ data }) => !data)) continue;

  const publishedVersions = versions.filter(({ data }) => !data.draft);
  if (
    publishedVersions.length > 0 &&
    publishedVersions.length < versions.length
  ) {
    errors.push(`${filename}: draft status must match in every language`);
  }

  const dates = new Set(
    versions.map(({ data }) =>
      data.date ? new Date(data.date).toISOString() : "missing",
    ),
  );
  if (dates.size > 1) {
    errors.push(`${filename}: publication date must match in every language`);
  }
}

if (errors.length > 0) {
  console.error("Translation validation failed:\n");
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Translation validation passed for ${filenames.size} article${filenames.size === 1 ? "" : "s"} across ${languages.length} languages.`,
);
