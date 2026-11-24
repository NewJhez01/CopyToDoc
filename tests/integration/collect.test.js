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
    await h.driver.findElement(By.css("#clip-list li button")).click();
    await h.driver.wait(async () => (await h.clipCount()) === 1, 5000);
    expect(await h.clipTexts()).toEqual(["Second selected sentence."]);
  });

  it("starts over after confirmation", async () => {
    await h.driver.findElement(By.id("start-over-button")).click();
    await h.driver.findElement(By.css("#start-over-dialog button.danger")).click();
    await h.driver.wait(async () => (await h.clipCount()) === 0, 5000);
  });
});
