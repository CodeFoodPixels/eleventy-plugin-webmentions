# eleventy-plugin-webmentions

A plugin for eleventy to fetch and filter [webmentions](https://indieweb.org/Webmention) from [Webmention.io](https://webmention.io).

## Install

Available on [npm](https://www.npmjs.com/package/eleventy-plugin-webmentions).

`npm install --save-dev eleventy-plugin-webmentions`

## Usage

In your Eleventy config file (probably `.eleventy.js`), load the plugin module and use `.addPlugin` to add it to Eleventy with an options object that defines the `domain` and the Webmention.io `token`.

### Example

```javascript
const Webmentions = require("eleventy-plugin-webmentions");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(Webmentions, {
    domain: "lukeb.co.uk",
    token: "ABC123XYZ987",
  });
};
```

## Configuration

Below are all the options that can be passed to the plugin:

<table>
<thead>
<tr>
<th>Option</th>
<th>Type</th>
<th>Required?</th>
<th>Default</th>
<th>Description</th> 
</tr>
</thead>
<tr>
<td>

`domain`

</td>
<td>string</td>
<td>

**Required**

</td>
<td>

`undefined`

</td>
<td>The domain you wish to get the webmentions for.</td>
</tr>

<tr>
<td>

`token`

</td>
<td>string</td>
<td>

**Required**

</td>
<td>

`undefined`

</td>
<td>The webmention.io token (found at the bottom of [the webmention.io settings page](https://webmention.io/settings)).</td>
</tr>

<tr>
<td>

`cacheDirectory`

</td>
<td>string</td>
<td>Optional</td>
<td>

`./_webmentioncache`

</td>
<td>The directory for webmentions to be cached to.</td>
</tr>

<tr>
<td>

`cacheTime`

</td>
<td>integer</td>
<td>Optional</td>
<td>

`3600`

</td>
<td>The time in seconds for the cached webmentions to be considered "fresh".</td>
</tr>

<tr>
<td>

`truncate`

</td>
<td>boolean</td>
<td>Optional</td>
<td>

`true`

</td>
<td>Whether or not to truncate the webmentions</td>
</tr>

<tr>
<td>

`maxContentLength`

</td>
<td>integer</td>
<td>Optional</td>
<td>

`280`

</td>
<td>The length to truncate webmentions to if `truncate` is true</td>
</tr>

<tr>
<td>

`truncationMarker`

</td>
<td>string</td>
<td>Optional</td>
<td>

`&hellip;`

</td>
<td>The string to truncate the content with</td>
</tr>

<tr>
<td>

`htmlContent`

</td>
<td>boolean</td>
<td>Optional</td>
<td>

`true`

</td>
<td>Whether or not to return HTML content from the webmentions. If `false`, just text content will be returned.</td>
</tr>

<tr>
<td>

`mentionTypes`

</td>
<td>object</td>
<td>Optional</td>
<td>

```javascript
{
  likes: ["like-of"],
  reposts: ["repost-of"],
  comments: [
    "mention-of",
    "in-reply-to"
  ]
}
```

</td>
<td>

A single layer object with groupings and types that should be returned for that grouping. The object can have any keys you wish (doesn't have to be `likes`, `reposts` and `comments` like the default) but each value should be an array of webmention types.[You can find a list of possible types here](https://github.com/aaronpk/webmention.io#find-links-of-a-specific-type-to-a-specific-page)

</td>
</tr>

<tr>
<td>

`sanitizeOptions`

</td>
<td>object</td>
<td>Optional</td>
<td>

```javascript
{
  allowedTags: ["b", "i", "em", "strong", "a"],
  allowedAttributes: {
    a: ["href"],
  },
}
```

</td>
<td>

A set of options passed to `sanitize-html`. You can find a full list of available options here [You can find a full list of available options here](https://github.com/apostrophecms/sanitize-html)

</td>
</tr>

<tr>
<td>

`sortFunction`

</td>
<td>function</td>
<td>Optional</td>
<td>

```javascript
(a, b) => {
  new Date(a.published || a["wm-received"]) -
  new Date(b.published || b["wm-received"])
```

</td>
<td>A function to use when sorting the webmentions. By default, the webmentions will be sorted in date ascending order, either by when they were published or when they were recieved.</td>
</tr>

</table>

### Defaults

All of the defaults are exposed on the `defaults` property of the module, so they can be used in your config if necessary.

Here is an example of extending the `sanitizeOptions` object:

```javascript
const Webmentions = require("eleventy-plugin-webmentions");

module.exports = function (eleventyConfig) {
  eleventyConfig.addPlugin(Webmentions, {
    domain: "lukeb.co.uk",
    token: "ABC123XYZ987",
    sanitizeOptions: {
      ...Webmentions.defaults.sanitizeOptions,
      allowedTags: [
        ...Webmentions.defaults.sanitizeOptions.allowedTags,
        "iframe",
        "marquee",
      ],
      disallowedTagsMode: "escape",
    },
  });
};
```
