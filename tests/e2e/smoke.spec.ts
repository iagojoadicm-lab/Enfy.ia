import { test, expect } from "@playwright/test";

test("login page carrega", async ({ page }) => {
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});
