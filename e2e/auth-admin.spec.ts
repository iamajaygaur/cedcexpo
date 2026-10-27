import { expect, test } from "@playwright/test";

import { e2eCredentials, loginAs } from "./helpers/auth";

const creds = e2eCredentials("admin");

test.describe("Authenticated admin", () => {
  test.skip(!creds, "Set E2E_ADMIN_USERNAME and E2E_ADMIN_PASSWORD to run");

  test("logs in and opens admin dashboard", async ({ page }) => {
    await loginAs(page, "admin");
    await expect(page).toHaveURL(/\/admin\/dashboard/);
    await expect(
      page
        .getByRole("heading", { name: /Team Evaluation Status/i })
        .or(page.getByRole("link", { name: /Create event/i }))
        .or(page.getByText(/No active event/i)),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("can open judges management", async ({ page }) => {
    await loginAs(page, "admin");
    await page.goto("/admin/judges");
    await expect(page.getByRole("heading", { name: /Judges/i })).toBeVisible({
      timeout: 15_000,
    });
  });
});
