const Webmentions = require("./webmentions");
const WebmentionFilters = require("./filters");

const config = async (eleventyConfig, options = {}) => {
  const webmentions = new Webmentions(options);
  const filters = WebmentionFilters(options);

  eleventyConfig.addGlobalData(
    "webmentions",
    async () => await webmentions.get()
  );
  eleventyConfig.addFilter("webmentionsForPage", filters.mentions);
  eleventyConfig.addFilter("webmentionCountForPage", filters.count);
};

config.sanitizeDefaults = WebmentionFilters.sanitizeDefaults;
config.typeDefaults = WebmentionFilters.typeDefaults;

module.exports = config;
