import { expect, test } from "@playwright/test";

test.describe("Forgot password", () => {
  test("admin forgot-password is reachable from login", async ({ page }) => {
    await page.goto("/login");
    await page.getByRole("button", { name: "Administrator" }).click();
    await page.getByRole("link", { name: /Forgot Password/i }).click();
    await expect(page).toHaveURL(/\/forgot-password/);
    await expect(
      page.getByRole("heading", { name: /Reset admin password/i }),
    ).toBeVisible();
    await expect(page.getByLabel(/Admin email/i)).toBeVisible();
  });
});
