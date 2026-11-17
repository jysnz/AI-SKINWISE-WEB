// Builds a contact sheet PNG from stills in marketing/out so a whole run can be reviewed at a glance.
//   node marketing/sheet.mjs out.png still-1.00s.png still-5.00s.png ...
import puppeteer from "puppeteer-core";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
const here = dirname(fileURLToPath(import.meta.url));
const [outName, ...files] = process.argv.slice(2);
const cols = Math.min(files.length, 4), rows = Math.ceil(files.length / cols);
const cw = 300, ch = Math.round(300 * 1920 / 1080);
const browser = await puppeteer.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true, defaultViewport: { width: cols * cw, height: rows * (ch + 22) } });
const page = await browser.newPage();
const html = `<body style="margin:0;background:#111;font:14px Segoe UI;color:#ddd;display:grid;grid-template-columns:repeat(${cols},${cw}px)">` +
  files.map((f) => `<div style="height:${ch + 22}px"><img style="width:${cw}px;height:${ch}px;display:block" src="data:image/png;base64,${readFileSync(join(here, "out", f)).toString("base64")}"><div style="padding:2px 6px">${f.replace("still-", "").replace(".png", "")}</div></div>`).join("") + "</body>";
await page.setContent(html, { waitUntil: "load" });
await page.screenshot({ path: join(here, "out", outName) });
await browser.close();
console.log("sheet", outName);
