import { cp, mkdtemp, readFile, readdir, rm, writeFile } from "node:fs/promises";
import http from "node:http";
import { tmpdir } from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Browser, Builder, By, until } from "selenium-webdriver";
import firefox from "selenium-webdriver/firefox.js";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const GECKO_ID = "copytodoc@harper-jones.local";
const UUID = "11111111-2222-4333-8444-555555555555";
const MANAGER_URL = `moz-extension://${UUID}/src/manager/manager.html`;
const FIREFOX_BINARY =
  process.env.FIREFOX_BINARY ??
  (process.platform === "darwin" ? "/Applications/Firefox.app/Contents/MacOS/firefox" : undefined);

// Test-only additions, appended to the *copy* of the background script.
// collect runs after a short delay so the page tab is active again when it fires.
const TEST_HOOKS = `
browser.runtime.onMessage.addListener((m) => {
  if (m?.op !== "test:collect") return undefined;
  setTimeout(collectSelection, 400);
  return Promise.resolve({ ok: true });
});
{
  const original = browser.downloads.download.bind(browser.downloads);
  browser.downloads.download = (options) => original({ ...options, saveAs: false });
}
`;

async function buildTestExtension(dir) {
  await cp(path.join(root, "src"), path.join(dir, "src"), { recursive: true });
  await cp(path.join(root, "icons"), path.join(dir, "icons"), { recursive: true });
  const manifest = JSON.parse(await readFile(path.join(root, "manifest.json"), "utf8"));
  manifest.host_permissions = ["<all_urls>"];
  await writeFile(path.join(dir, "manifest.json"), JSON.stringify(manifest, null, 2));
  const background = path.join(dir, "src/background/background.js");
  await writeFile(background, (await readFile(background, "utf8")) + TEST_HOOKS);
}

function startPageServer() {
  const server = http.createServer((request, response) => {
    response.setHeader("content-type", "text/html; charset=utf-8");
    response.end(
      `<title>Test Page ${request.url}</title><p id="a">First selected sentence.</p><p id="b">Second selected sentence.</p>`,
    );
  });
  return new Promise((resolve) => server.listen(0, "127.0.0.1", () => resolve(server)));
}

export async function startHarness() {
  const workDir = await mkdtemp(path.join(tmpdir(), "copytodoc-it-"));
  const extensionDir = path.join(workDir, "extension");
  const downloadDir = path.join(workDir, "downloads");
  await buildTestExtension(extensionDir);
  const server = await startPageServer();
  const pageUrl = `http://127.0.0.1:${server.address().port}/`;

  const options = new firefox.Options().addArguments("-headless");
  if (FIREFOX_BINARY) options.setBinary(FIREFOX_BINARY);
  options.setPreference("extensions.webextensions.uuids", JSON.stringify({ [GECKO_ID]: UUID }));
  options.setPreference("browser.download.folderList", 2);
  options.setPreference("browser.download.dir", downloadDir);
  options.setPreference("browser.download.useDownloadDir", true);
  const service = new firefox.ServiceBuilder().addArguments("--allow-system-access");
  const driver = await new Builder()
    .forBrowser(Browser.FIREFOX)
    .setFirefoxOptions(options)
    .setFirefoxService(service)
    .build();
  await driver.installAddon(extensionDir, true);

  const pageHandle = await driver.getWindowHandle();
  let managerHandle = null;

  async function openManager() {
    const before = await driver.getAllWindowHandles();
    await driver.setContext("chrome");
    await driver.executeScript("gBrowser.selectedTab = gBrowser.addTrustedTab(arguments[0]);", MANAGER_URL);
    await driver.setContext("content");
    const after = await driver.getAllWindowHandles();
    managerHandle = after.find((h) => !before.includes(h));
    await driver.switchTo().window(managerHandle);
    await driver.wait(until.elementLocated(By.id("clip-count")), 10000);
  }

  async function clipCount() {
    await driver.switchTo().window(managerHandle);
    return Number(await driver.findElement(By.id("clip-count")).getText());
  }

  async function clipTexts() {
    await driver.switchTo().window(managerHandle);
    const items = await driver.findElements(By.css("#clip-list .clip-text"));
    return Promise.all(items.map((i) => i.getText()));
  }

  // Selects text on a page, triggers the collect command, and waits for the new clip.
  async function collect(selector, urlPath = "") {
    const expected = (await clipCount()) + 1;
    await driver.switchTo().window(pageHandle);
    await driver.get(pageUrl + urlPath);
    await driver.executeScript(
      "const r=document.createRange();r.selectNodeContents(document.querySelector(arguments[0]));const s=getSelection();s.removeAllRanges();s.addRange(r);",
      selector,
    );
    await driver.switchTo().window(managerHandle);
    await driver.executeAsyncScript(
      "const done = arguments[arguments.length - 1]; browser.runtime.sendMessage({ op: 'test:collect' }).then(done);",
    );
    await driver.switchTo().window(pageHandle);
    await driver.sleep(1200);
    await driver.wait(async () => (await clipCount()) >= expected, 10000);
  }

  async function waitForDownload() {
    const file = await driver.wait(async () => {
      const names = await readdir(downloadDir).catch(() => []);
      return names.find((n) => n.endsWith(".md"));
    }, 15000);
    return readFile(path.join(downloadDir, file), "utf8");
  }

  return {
    driver,
    pageUrl,
    workDir,
    openManager,
    clipCount,
    clipTexts,
    collect,
    waitForDownload,
    async stop() {
      await driver.quit().catch(() => {});
      server.close();
      await rm(workDir, { recursive: true, force: true });
    },
  };
}
