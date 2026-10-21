"use strict";
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const { execFileSync } = require("node:child_process");

const repoRoot = path.resolve(__dirname, "..", "..");
const root = path.join(repoRoot, "MusouGame");
const htmlPath = path.join(root, "index.html");
const before = fs.readFileSync(htmlPath, "utf8");

// A clean generation must not change the committed HTML.
execFileSync(process.execPath, [path.join(__dirname, "renderer.js")], {
  cwd: repoRoot, encoding: "utf8"
});
const html = fs.readFileSync(htmlPath, "utf8");
assert.equal(html, before, "Generated HTML differs from the checked-in file");

const model = JSON.parse(
  fs.readFileSync(path.join(root, "Presentation", "presentation.json"), "utf8")
);
assert.equal((html.match(/class="section"/g) || []).length, model.sections.length);
assert.equal((html.match(/type="radio"/g) || []).length, 3);
assert.equal((html.match(/class="combo-panel"/g) || []).length, 3);
assert.equal((html.match(/class="shop-item /g) || []).length, 3);
assert.ok(html.includes("弱 → STEP → 強 → STEP → 強"));
assert.ok(html.includes("長い前隙"));
assert.ok(html.includes("全3枠"));
assert.ok(!html.includes("{{TITLE}}"));
assert.ok(!/<script\b/i.test(html), "HTML should not depend on browser JS");
console.log("OK: HTML regeneration and smoke checks");
