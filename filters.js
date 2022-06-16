const { isRedirect } = require("node-fetch");
const { URL } = require("url");

const allowedTypes = {
  likes: ["like-of"],
  reposts: ["repost-of"],
  comments: ["mention-of", "in-reply-to"],
};

function stripTrailingSlashes(str) {
  let i = str.length;
  while (str[--i] === "/");
  return str.slice(0, i + 1);
}

module.exports = ({
  maxContentLength = 280,
  truncationMarker = '&hellip; <span class="webmention__truncated">Truncated</span>',
  types = allowedTypes,
}) => {
  function filterWebmentions(webmentions, page) {
    const pageUrl = new URL(page, "https://lukeb.co.uk");

    const flattenedAllowedTypes = Object.values(types).flat();

    return webmentions
      .filter((mention) => {
        const target = new URL(mention["wm-target"]);
        const regex = new RegExp(`${stripTrailingSlashes(pageUrl.pathname)}$`);
        return regex.test(stripTrailingSlashes(target.pathname));
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
      entry.content.value =
        maxContentLength > 0 && entry.content.text.length > maxContentLength
          ? `${entry.content.text.substr(
              0,
              maxContentLength
            )}${truncationMarker}`
          : entry.content.text;
    }
    return entry;
  }

  function count(webmentions, page) {
    return filterWebmentions(webmentions, page).length;
  }

  function mentions(webmentions, page) {
    const cleanedWebmentions = filterWebmentions(webmentions, page)
      .sort(
        (a, b) =>
          new Date(a.published || a["wm-received"]) -
          new Date(b.published || b["wm-received"])
      )
      .map(clean);

    const returnedWebmentions = {
      total: cleanedWebmentions.length,
    };

    Object.keys(types).map((type) => {
      returnedWebmentions[type] = cleanedWebmentions.filter((mention) =>
        types[type].includes(mention["wm-property"])
      );
    });

    return returnedWebmentions;
  }

  return {
    count,
    mentions,
  };
};
