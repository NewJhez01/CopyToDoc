import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { By } from "selenium-webdriver";
import { startHarness } from "./helpers.js";

describe("collecting clips", () => {
  let h;
  beforeAll(async () => {
    h = await startHarness();
    await h.openManager();
  });
  afterAll(() => h?.stop());

  it("adds a clip with its page title and URL and shows the count", async () => {
    await h.collect("#a", "first");
    expect(await h.clipCount()).toBe(1);
    expect(await h.clipTexts()).toEqual(["First selected sentence."]);
    const source = await h.driver.findElement(By.css("#clip-list .clip-source")).getText();
    expect(source).toContain("Test Page /first");
    expect(source).toContain(`${h.pageUrl}first`);
  });

  it("keeps clips in order and removes a single clip", async () => {
    await h.collect("#b", "second");
    expect(await h.clipTexts()).toEqual(["First selected sentence.", "Second selected sentence."]);
    await h.driver.findElement(By.css("#clip-list li .remove")).click();
    await h.driver.wait(async () => (await h.clipCount()) === 1, 5000);
    expect(await h.clipTexts()).toEqual(["Second selected sentence."]);
  });

  it("starts over after confirmation", async () => {
    await h.driver.findElement(By.id("start-over-button")).click();
    await h.driver.findElement(By.css("#start-over-dialog button.danger")).click();
    await h.driver.wait(async () => (await h.clipCount()) === 0, 5000);
  });
});

describe("managing clips", () => {
  let h;
  const click = (css) => h.driver.findElement(By.css(css)).click();
  const waitForTexts = (expected) =>
    h.driver.wait(async () => JSON.stringify(await h.clipTexts()) === JSON.stringify(expected), 5000);

  beforeAll(async () => {
    h = await startHarness();
    await h.openManager();
    await h.collect("#a", "first");
    await h.collect("#b", "second");
  });
  afterAll(() => h?.stop());

  it("moves a clip down and up", async () => {
    await click("#clip-list li:first-child .move-down");
    await waitForTexts(["Second selected sentence.", "First selected sentence."]);
    await click("#clip-list li:last-child .move-up");
    await waitForTexts(["First selected sentence.", "Second selected sentence."]);
  });

  it("edits a clip and refuses blank text", async () => {
    await click("#clip-list li:first-child .edit");
    await h.driver.findElement(By.css("#clip-list textarea")).clear();
    await h.driver.findElement(By.xpath("//button[text()='Save']")).click();
    await h.driver.wait(async () => (await h.driver.findElements(By.css(".clip-error"))).length === 1, 5000);
    await h.driver.findElement(By.css("#clip-list textarea")).sendKeys("Edited sentence.");
    await h.driver.findElement(By.xpath("//button[text()='Save']")).click();
    await waitForTexts(["Edited sentence.", "Second selected sentence."]);
    expect(await h.driver.findElement(By.css("#clip-list .clip-source")).getText()).toContain("Test Page /first");
  });

  it("undoes a remove and then a start over", async () => {
    await click("#clip-list li:first-child .remove");
    await waitForTexts(["Second selected sentence."]);
    await click("#undo-button");
    await waitForTexts(["Edited sentence.", "Second selected sentence."]);
    expect(await h.driver.findElement(By.id("undo-button")).isDisplayed()).toBe(false);

    await click("#start-over-button");
    await click("#start-over-dialog button.danger");
    await h.driver.wait(async () => (await h.clipCount()) === 0, 5000);
    await click("#undo-button");
    await waitForTexts(["Edited sentence.", "Second selected sentence."]);
  });
});
