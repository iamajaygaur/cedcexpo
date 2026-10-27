import { expect, test } from "@playwright/test";

test.describe("Home", () => {
  test("renders brand hero and primary CTA", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { name: /CEDC Expo/i })).toBeVisible();
    await expect(page.getByRole("link", { name: /Access the Platform/i })).toBeVisible();
  });

  test("home visual baseline", async ({ page }) => {
    await page.goto("/");
    await page.getByRole("heading", { name: /CEDC Expo/i }).waitFor();
    await expect(page).toHaveScreenshot("home.png", {
      fullPage: true,
      animations: "disabled",
      maxDiffPixelRatio: 0.02,
    });
  });
});
