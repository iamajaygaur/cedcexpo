import { expect, type Page } from "@playwright/test";

export type E2ERole = "admin" | "judge";

export function e2eCredentials(role: E2ERole): {
  username: string;
  password: string;
} | null {
  if (role === "admin") {
    const username =
      process.env.E2E_ADMIN_USERNAME ?? process.env.E2E_ADMIN_EMAIL ?? "";
    const password = process.env.E2E_ADMIN_PASSWORD ?? "";
    if (!username || !password) return null;
    return { username, password };
  }

  const username = process.env.E2E_JUDGE_USERNAME ?? "";
  const password = process.env.E2E_JUDGE_PASSWORD ?? "";
  if (!username || !password) return null;
  return { username, password };
}

/** UI login on /login. Admin uses the Administrator role tab + email. */
export async function loginAs(page: Page, role: E2ERole) {
  const creds = e2eCredentials(role);
  if (!creds) {
    throw new Error(
      `Missing E2E_${role === "admin" ? "ADMIN" : "JUDGE"}_* credentials`,
    );
  }

  await page.goto("/login");

  if (role === "admin") {
    await page.getByRole("button", { name: "Administrator" }).click();
    await expect(page.getByLabel(/Admin Email Address/i)).toBeVisible();
  } else {
    await page.getByRole("button", { name: "Judge" }).click();
    await expect(page.getByLabel(/Judge Username/i)).toBeVisible();
  }

  await page.locator("#username").fill(creds.username);
  await page.locator("#password").fill(creds.password);
  await page.locator("#login-submit-btn").click();

  const expected =
    role === "admin" ? /\/admin(\/|$)/ : /\/judge(\/|$)/;
  await page.waitForURL(expected, { timeout: 30_000 });
}
