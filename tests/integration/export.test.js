import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { By, until } from "selenium-webdriver";
import { startHarness } from "./helpers.js";

const ORIGINAL = "# Notes\n\nExisting content.\n";

describe("loading a file and exporting", () => {
  let h;
  let filePath;
  beforeAll(async () => {
    h = await startHarness();
    await mkdir(path.join(h.workDir, "input"), { recursive: true });
    filePath = path.join(h.workDir, "input", "notes.md");
    await writeFile(filePath, ORIGINAL);
    await h.openManager();
    await h.driver.executeScript("const i = document.getElementById('file-input'); i.hidden = false; i.style.display = 'block';");
    await h.driver.findElement(By.id("file-input")).sendKeys(filePath);
    await h.driver.wait(async () => (await h.driver.findElement(By.id("file-name")).getText()).includes("notes.md"), 10000);
    await h.collect("#a", "first");
    await h.collect("#b", "second");
  });
  afterAll(() => h?.stop());

  it("exports the original content followed by the clips in the moved order and source links, then offers to clear", async () => {
    await h.driver.findElement(By.css("#clip-list li:first-child .move-down")).click();
    await h.driver.wait(async () => (await h.clipTexts())[0] === "Second selected sentence.", 5000);
    await h.driver.findElement(By.id("include-sources")).click();
    await h.driver.findElement(By.id("export-button")).click();
    const saved = await h.waitForDownload();
    expect(saved.startsWith(ORIGINAL.trimEnd())).toBe(true);
    expect(saved).toContain("First selected sentence.");
    expect(saved).toContain("Second selected sentence.");
    expect(saved.indexOf("Second selected")).toBeLessThan(saved.indexOf("First selected"));
    expect(saved).toContain(`[Test Page /first](${h.pageUrl}first)`);
    expect(saved).toContain(`[Test Page /second](${h.pageUrl}second)`);
    expect(await readFile(filePath, "utf8")).toBe(ORIGINAL);

    const dialog = h.driver.findElement(By.id("clear-dialog"));
    await h.driver.wait(until.elementIsVisible(dialog), 15000);
    await dialog.findElement(By.css("button[value='no']")).click();
    expect(await h.clipCount()).toBe(2);
  });
});
