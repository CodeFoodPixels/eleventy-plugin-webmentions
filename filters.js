const { URL } = require("url");

const defaults = {
  mentionTypes: {
    likes: ["like-of"],
    reposts: ["repost-of"],
    comments: ["mention-of", "in-reply-to"],
  },
};

function stripOuterSlashes(str) {
  let start = 0;
  while (str[start++] === "/");
  let end = str.length;
  while (str[--end] === "/");
  return str.slice(start - 1, end + 1);
}

const filters = ({ mentionTypes = defaults.mentionTypes }) => {
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

  function count(webmentions, page) {
    return filterWebmentions(webmentions, page).length;
  }

  function mentions(webmentions, page) {
    const filteredWebmentions = filterWebmentions(webmentions, page);

    const returnedWebmentions = {
      total: filteredWebmentions.length,
    };

    Object.keys(mentionTypes).map((type) => {
      returnedWebmentions[type] = filteredWebmentions.filter((mention) =>
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
