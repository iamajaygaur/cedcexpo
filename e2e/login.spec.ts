import { expect, test } from "@playwright/test";

test.describe("Login", () => {
  test("shows sign-in form", async ({ page }) => {
    await page.goto("/login");
    await expect(page.getByRole("link", { name: /Back to Expo Home/i })).toBeVisible();
    await expect(page.getByLabel(/Judge Username/i)).toBeVisible();
  });

  test("login visual baseline", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("link", { name: /Back to Expo Home/i }).waitFor();
    await expect(page).toHaveScreenshot("login.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});
