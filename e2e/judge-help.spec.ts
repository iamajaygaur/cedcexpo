import { expect, test } from "@playwright/test";

test.describe("Judge help", () => {
  test("shows password help request form", async ({ page }) => {
    await page.goto("/judge-help");
    await expect(
      page.getByRole("heading", { name: /Judge sign-in help/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Judge username/i)).toBeVisible();
    await expect(
      page.getByRole("button", { name: /Request help/i }),
    ).toBeVisible();
  });

  test("login judge tab links to help page", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: /Judge/i }).click();
    await page.getByRole("link", { name: /Need help signing in/i }).click();
    await expect(page).toHaveURL(/\/judge-help/);
  });
});
