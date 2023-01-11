const fs = require("fs").promises;
const fetch = require("node-fetch");
const truncateHTML = require("truncate-html");
const sanitizeHTML = require("sanitize-html");
const { encode } = require("html-entities");
const canonical = import("@tweetback/canonical");

const defaults = {
  cacheDirectory: "./_webmentioncache",
  cacheTime: 3600,
  truncate: true,
  maxContentLength: 280,
  truncationMarker: "&hellip;",
  htmlContent: true,
  useCanonicalTwitterUrls: true,
  sanitizeOptions: {
    allowedTags: ["b", "i", "em", "strong", "a", "p"],
    allowedAttributes: {
      a: ["href"],
    },
  },
  sortFunction: (a, b) =>
    new Date(a.published || a["wm-received"]) -
    new Date(b.published || b["wm-received"]),
};
function Webmentions({
  domain,
  token,
  cacheDirectory = defaults.cacheDirectory,
  cacheTime = defaults.cacheTime,
  truncate = defaults.truncate,
  maxContentLength = defaults.maxContentLength,
  truncationMarker = defaults.truncationMarker,
  htmlContent = defaults.htmlContent,
  useCanonicalTwitterUrls = defaults.useCanonicalTwitterUrls,
  sanitizeOptions = defaults.sanitizeOptions,
  sortFunction = defaults.sortFunction,
}) {
  if (typeof domain !== "string" || domain.length === 0) {
    throw new Error("Domain must be provided as a string");
  }

  if (typeof token !== "string" || token.length === 0) {
    throw new Error("Domain must be provided as a string");
  }

  function getUrl() {
    return `https://webmention.io/api/mentions.jf2?domain=${domain}&token=${token}`;
  }

  async function fetchWebmentions(since, page = 0) {
    const PER_PAGE = 1000;

    const params = `&per-page=${PER_PAGE}&page=${page}${
      since ? `&since=${since}` : ""
    }`;
    const response = await fetch(`${getUrl()}${params}`);

    if (response.ok) {
      const feed = await response.json();
      if (feed.children.length === PER_PAGE) {
        const olderMentions = await fetchWebmentions(since, page + 1);

        return [...feed.children, ...olderMentions];
      }
      return feed.children;
    }

    return null;
  }

  async function writeToCache(data) {
    const filePath = `${cacheDirectory}/webmentions.json`;
    const fileContent = JSON.stringify(data, null, 2);

    // create cache folder if it doesnt exist already
    if (!(await fs.stat(cacheDirectory).catch(() => false))) {
      await fs.mkdir(cacheDirectory);
    }
    // write data to cache json file
    await fs.writeFile(filePath, fileContent);
  }

  async function readFromCache() {
    const filePath = `${cacheDirectory}/webmentions.json`;

    if (await fs.stat(filePath).catch(() => false)) {
      const cacheFile = await fs.readFile(filePath);
      return JSON.parse(cacheFile);
    }

    return {
      lastFetched: null,
      children: [],
    };
  }

  async function clean(entry) {
    const { transform } = await canonical;

    if (useCanonicalTwitterUrls) {
      entry.url = transform(entry.url);
      entry.author.url = transform(entry.author.url);
    }

    if (entry.content) {
      if (entry.content.html && htmlContent) {
        if (useCanonicalTwitterUrls) {
          entry.content.html = entry.content.html.replaceAll(
            /"(https:\/\/twitter.com\/(.+?))"/g,
            function (match, p1) {
              return transform(p1);
            }
          );
        }

        if (!entry.content.html.match(/^<\/?[a-z][\s\S]*>/)) {
          const paragraphs = entry.content.html
            .split("\n")
            .filter((p) => p.length > 0);

          entry.content.html = `<p>${paragraphs.join("</p><p>")}</p>`;
        }

        const sanitizedContent = sanitizeHTML(
          entry.content.html,
          sanitizeOptions
        );

        if (truncate) {
          const truncatedContent = truncateHTML(
            sanitizedContent,
            maxContentLength,
            { ellipsis: truncationMarker, decodeEntities: true }
          );

          entry.content.value = truncatedContent.replace(
            encode(truncationMarker),
            truncationMarker
          );
        } else {
          entry.content.value = sanitizedContent;
        }
      } else {
        entry.content.value =
          truncate && entry.content.text.length > maxContentLength
            ? `${entry.content.text.substr(
                0,
                maxContentLength
              )}${truncationMarker}`
            : entry.content.text;

        if (htmlContent) {
          const paragraphs = entry.content.value
            .split("\n")
            .filter((p) => p.length > 0);

          entry.content.value = `<p>${paragraphs.join("</p><p>")}</p>`;
        }
      }
    }

    return entry;
  }

  async function get() {
    const webmentions = await readFromCache();

    if (
      !webmentions.lastFetched ||
      Date.now() - new Date(webmentions.lastFetched) >= cacheTime * 1000
    ) {
      const feed = await fetchWebmentions(webmentions.lastFetched);

      if (feed) {
        webmentions.lastFetched = new Date().toISOString();
        webmentions.children = [...feed, ...webmentions.children];

        await writeToCache(webmentions);
      }
    }

    webmentions.children = await Promise.all(
      webmentions.children.sort(sortFunction).map(clean)
    );

    return webmentions;
  }

  return { get };
}

Webmentions.defaults = defaults;

module.exports = Webmentions;
