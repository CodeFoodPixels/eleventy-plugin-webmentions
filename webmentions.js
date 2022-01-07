const fs = require("fs").promises;
const fetch = require("node-fetch");

module.exports = class Webmentions {
  constructor({
    domain,
    token,
    cacheDirectory = "./_webmentioncache",
    cacheTime = 3600,
  }) {
    this.domain = domain;
    this.token = token;
    this.cacheDirectory = cacheDirectory;
    this.cacheTime = cacheTime;
  }

  getUrl() {
    return `https://webmention.io/api/mentions.jf2?domain=${this.domain}&token=${this.token}`;
  }

  async fetchWebmentions(since, page = 0) {
    const PER_PAGE = 1000;

    const params = `&per-page=${PER_PAGE}&page=${page}${
      since ? `&since=${since}` : ""
    }`;
    const response = await fetch(`${this.getUrl()}${params}`);

    if (response.ok) {
      const feed = await response.json();
      if (feed.children.length === PER_PAGE) {
        console.log(feed.children);
        const olderMentions = await this.fetchWebmentions(since, page + 1);

        return [...feed.children, ...olderMentions];
      }
      return feed.children;
    }

    return null;
  }

  async writeToCache(data) {
    const filePath = `${this.cacheDirectory}/webmentions.json`;
    const fileContent = JSON.stringify(data, null, 2);

    // create cache folder if it doesnt exist already
    if (!(await fs.stat(this.cacheDirectory).catch(() => false))) {
      await fs.mkdir(this.cacheDirectory);
    }
    // write data to cache json file
    await fs.writeFile(filePath, fileContent);
  }

  async readFromCache() {
    const filePath = `${this.cacheDirectory}/webmentions.json`;

    if (await fs.stat(filePath).catch(() => false)) {
      const cacheFile = await fs.readFile(filePath);
      return JSON.parse(cacheFile);
    }

    return {
      lastFetched: null,
      children: [],
    };
  }

  async get() {
    const cache = await this.readFromCache();

    if (
      !cache.lastFetched ||
      Date.now() - new Date(cache.lastFetched) >= this.cacheTime * 1000
    ) {
      const feed = await this.fetchWebmentions(cache.lastFetched);

      if (feed) {
        const webmentions = {
          lastFetched: new Date().toISOString(),
          children: [...feed, ...cache.children],
        };

        await this.writeToCache(webmentions);
        return webmentions.children;
      }
    }
    return cache.children;
  }
};
