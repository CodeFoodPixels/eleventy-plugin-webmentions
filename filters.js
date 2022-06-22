const { URL } = require("url");
const truncateHTML = require("truncate-html");
const sanitizeHTML = require("sanitize-html");
const { encode } = require("html-entities");

const sanitizeDefaults = {
  allowedTags: ["b", "i", "em", "strong", "a"],
  allowedAttributes: {
    a: ["href"],
  },
};
const typeDefaults = {
  likes: ["like-of"],
  reposts: ["repost-of"],
  comments: ["mention-of", "in-reply-to"],
};

function defaultSort(a, b) {
  return (
    new Date(a.published || a["wm-received"]) -
    new Date(b.published || b["wm-received"])
  );
}

function stripOuterSlashes(str) {
  let start = 0;
  while (str[start++] === "/");
  let end = str.length;
  while (str[--end] === "/");
  return str.slice(start - 1, end + 1);
}

const filters = ({
  maxContentLength = 280,
  truncationMarker = "&hellip;",
  htmlContent = true,
  allowedTypes = typeDefaults,
  sanitizeOptions = sanitizeDefaults,
  sortFunction = defaultSort,
}) => {
  function filterWebmentions(webmentions, page) {
    const pageUrl = new URL(page, "https://lukeb.co.uk");

    const flattenedAllowedTypes = Object.values(allowedTypes).flat();

    return webmentions
      .filter((mention) => {
        const target = new URL(mention["wm-target"]);

        return (
          stripOuterSlashes(pageUrl.pathname.toLowerCase()) ===
          stripOuterSlashes(target.pathname.toLowerCase())
        );
      })
      .filter(
        (entry) => !!entry.author && (!!entry.author.name || entry.author.url)
      )
      .filter((mention) =>
        flattenedAllowedTypes.includes(mention["wm-property"])
      );
  }

  function clean(entry) {
    if (entry.content) {
      if (entry.content.html && htmlContent) {
        const sanitizedContent = sanitizeHTML(
          entry.content.html,
          sanitizeOptions
        );
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
        entry.content.value =
          maxContentLength > 0 && entry.content.text.length > maxContentLength
            ? `${entry.content.text.substr(
                0,
                maxContentLength
              )}${truncationMarker}`
            : entry.content.text;
      }
    }
    return entry;
  }

  function count(webmentions, page) {
    return filterWebmentions(webmentions, page).length;
  }

  function mentions(webmentions, page) {
    const cleanedWebmentions = filterWebmentions(webmentions, page)
      .sort(sortFunction)
      .map(clean);

    const returnedWebmentions = {
      total: cleanedWebmentions.length,
    };

    Object.keys(allowedTypes).map((type) => {
      returnedWebmentions[type] = cleanedWebmentions.filter((mention) =>
        allowedTypes[type].includes(mention["wm-property"])
      );
    });

    return returnedWebmentions;
  }

  return {
    count,
    mentions,
  };
};

filters.sanitizeDefaults = sanitizeDefaults;
filters.typeDefaults = typeDefaults;

module.exports = filters;
