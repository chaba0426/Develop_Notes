"use strict";

// Converts Web/index.html + style.css + script.js to one offline HTML.
// node MusouGame/Web/build.js [--check]
const fs = require("node:fs");
const path = require("node:path");
const assert = require("node:assert/strict");

const web = __dirname;
const destination = path.resolve(web, "..", "index.html");
const read = (name) => fs.readFileSync(path.join(web, name), "utf8");
const cssMarker = '<link rel="stylesheet" href="./style.css" data-bundle="css">';
const jsMarker = '<script defer src="./script.js" data-bundle="js"></script>';

function replaceOnce(text, marker, replacement) {
  const parts = text.split(marker);
  assert.equal(parts.length, 2, "Expected one marker: " + marker);
  return parts.join(replacement);
}

function generate() {
  const source = read("index.html");
  const css = read("style.css");
  const js = read("script.js");
  assert.ok(!css.toLowerCase().includes("</style"), "Closing style tag inside CSS");
  assert.ok(!js.toLowerCase().includes("</script"), "Closing script tag inside JS");
  let html = replaceOnce(source, cssMarker, "<style>\n" + css + "</style>");
  html = replaceOnce(html, jsMarker, "<script>\n" + js + "</script>");
  // Reference WebP images remain separate in the editor source but are embedded
  // into the generated single-file HTML for reliable offline viewing.
  const assetPattern = /((?:src|href)=")\.\.\/Assets\/([a-z0-9_-]+\.webp)"/gi;
  const cache = new Map();
  html = html.replace(assetPattern, (_, attr, fileName) => {
    if (!cache.has(fileName)) {
      const imagePath = path.resolve(web, "..", "Assets", fileName);
      cache.set(fileName, "data:image/webp;base64," + fs.readFileSync(imagePath).toString("base64"));
    }
    return attr + cache.get(fileName) + '"';
  });
  assert.ok(!html.includes("../Assets/"), "Unbundled asset path");
  assert.ok(html.includes("</html>"), "Missing closing HTML tag");
  return html;
}

const args = process.argv.slice(2);
assert.ok(args.length === 0 || (args.length === 1 && args[0] === "--check"),
  "Usage: node MusouGame/Web/build.js [--check]");
const output = generate();

if (args[0] === "--check") {
  assert.equal(fs.readFileSync(destination, "utf8"), output,
    "Stale index.html: run node MusouGame/Web/build.js");
  console.log("OK: single-file HTML is up to date");
} else {
  fs.writeFileSync(destination, output, "utf8");
  console.log("Generated " + destination);
}
