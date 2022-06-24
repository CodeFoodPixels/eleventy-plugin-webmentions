const { URL } = require("url");
const truncateHTML = require("truncate-html");
const sanitizeHTML = require("sanitize-html");
const { encode } = require("html-entities");

const defaults = {
  truncate: true,
  maxContentLength: 280,
  truncationMarker: "&hellip;",
  htmlContent: true,
  mentionTypes: {
    likes: ["like-of"],
    reposts: ["repost-of"],
    comments: ["mention-of", "in-reply-to"],
  },
  sanitizeOptions: {
    allowedTags: ["b", "i", "em", "strong", "a"],
    allowedAttributes: {
      a: ["href"],
    },
  },
  sortFunction: (a, b) =>
    new Date(a.published || a["wm-received"]) -
    new Date(b.published || b["wm-received"]),
};

function stripOuterSlashes(str) {
  let start = 0;
  while (str[start++] === "/");
  let end = str.length;
  while (str[--end] === "/");
  return str.slice(start - 1, end + 1);
}

const filters = ({
  truncate = defaults.truncate,
  maxContentLength = defaults.maxContentLength,
  truncationMarker = defaults.truncationMarker,
  htmlContent = defaults.htmlContent,
  mentionTypes = defaults.mentionTypes,
  sanitizeOptions = defaults.sanitizeOptions,
  sortFunction = defaults.sortFunction,
}) => {
  function filterWebmentions(webmentions, page) {
    const pageUrl = new URL(page, "https://lukeb.co.uk");

    const flattenedMentionTypes = Object.values(mentionTypes).flat();

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
        flattenedMentionTypes.includes(mention["wm-property"])
      );
  }

  function clean(entry) {
    if (entry.content) {
      if (entry.content.html && htmlContent) {
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

    Object.keys(mentionTypes).map((type) => {
      returnedWebmentions[type] = cleanedWebmentions.filter((mention) =>
        mentionTypes[type].includes(mention["wm-property"])
      );
    });

    return returnedWebmentions;
  }

  return {
    count,
    mentions,
  };
};

filters.defaults = defaults;

module.exports = filters;
