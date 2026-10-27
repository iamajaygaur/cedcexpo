import { expect, test } from "@playwright/test";

import { e2eCredentials, loginAs } from "./helpers/auth";

const creds = e2eCredentials("judge");

test.describe("Authenticated judge", () => {
  test.skip(!creds, "Set E2E_JUDGE_USERNAME and E2E_JUDGE_PASSWORD to run");

  test("logs in and opens judge dashboard", async ({ page }) => {
    await loginAs(page, "judge");
    await expect(page).toHaveURL(/\/judge\/dashboard/);
    await expect(
      page.getByRole("heading", { name: /Judge Dashboard/i }),
    ).toBeVisible({ timeout: 15_000 });
  });

  test("can open an assigned project when present", async ({ page }) => {
    await loginAs(page, "judge");
    await expect(
      page.getByRole("heading", { name: /Judge Dashboard/i }),
    ).toBeVisible({ timeout: 15_000 });

    const projectLink = page
      .getByRole("link", { name: /Evaluate Project|Continue Evaluation/i })
      .first();

    if ((await projectLink.count()) === 0) {
      test.info().annotations.push({
        type: "note",
        description: "No evaluate CTA on dashboard — assignments may be empty",
      });
      return;
    }

    await projectLink.click();
    await expect(page).toHaveURL(/\/judge\//);
  });
});
