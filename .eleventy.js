const Webmentions = require("./webmentions");
const WebmentionFilters = require("./filters");

const config = async (eleventyConfig, options = {}) => {
  const webmentions = Webmentions(options);
  const filters = WebmentionFilters(options);

  const data = webmentions.get();

  eleventyConfig.addGlobalData("webmentions", async () => {
    const { children } = await data;
    return children;
  });

  eleventyConfig.addGlobalData("webmentionsLastFetched", async () => {
    const { lastFetched } = await data;
    return new Date(lastFetched);
  });

  eleventyConfig.addFilter("webmentionsForPage", filters.mentions);
  eleventyConfig.addFilter("webmentionCountForPage", filters.count);
};

config.defaults = {
  ...Webmentions.defaults,
  ...WebmentionFilters.defaults,
};

module.exports = config;
