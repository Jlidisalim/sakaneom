import { expect, test } from "@playwright/test";

// The one business-critical flow: a visitor submits "Request Info", the lead is
// persisted, and the admin can read it. If this breaks, SAKANEOM loses money.
test("money path — visitor submits a lead and the admin sees it", async ({ page }) => {
  const stamp = Date.now();
  const name = `E2E Visitor ${stamp}`;
  const email = `e2e+${stamp}@example.com`;

  // 1) Public homepage → contact form
  await page.goto("/");
  const form = page.locator("#contact form");
  await form.locator('input[name="name"]').fill(name);
  await form.locator('input[name="email"]').fill(email);
  await form.locator('textarea[name="msg"]').fill("Interested in a unit — e2e test.");
  await form.locator('input[type="checkbox"]').check();
  // Wait past the anti-spam minimum-submit-time guard (humans don't submit in
  // under 1.5s); a faster submit is treated as a bot and silently dropped.
  await page.waitForTimeout(1700);
  await form.getByRole("button").click();

  // Success confirmation rendered (the ✓ block), not an error toast.
  await expect(form).toContainText("✓", { timeout: 10_000 });

  // 2) Admin logs in (per-user email + password) and finds the persisted lead.
  // Fresh .e2e-tmp store → first login with the bootstrap ADMIN_EMAIL/ADMIN_PASSWORD
  // creates the Super Admin (see playwright.config env).
  await page.goto("/admin");
  await page.locator("#email").fill("admin@sakaneom.tn");
  await page.locator('input[type="password"]').fill("e2e-admin-password");
  await page.getByRole("button", { name: /se connecter/i }).click();

  // The lead lives under the "Demandes web" panel (Super Admin / Manager only).
  await page
    .getByRole("button", { name: /demandes web/i })
    .first()
    .click();
  await expect(page.getByText(email)).toBeVisible({ timeout: 10_000 });
});
