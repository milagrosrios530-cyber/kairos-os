import { expect, test } from "@playwright/test";

test("login is usable and includes security headers", async ({ page }) => {
  const response = await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Acceso del equipo" })).toBeVisible();
  await expect(page.getByLabel(/correo corporativo o dni/i)).toBeVisible();
  await expect(page.getByRole("textbox", { name: "Contraseña", exact: true })).toBeVisible();
  expect(response?.headers()["content-security-policy"]).toContain("frame-ancestors 'none'");
});

test("private pages redirect an anonymous visitor", async ({ page }) => {
  await page.goto("/app");
  await expect(page).toHaveURL(/\/login/);
  await expect(page.getByRole("heading", { name: "Acceso del equipo" })).toBeVisible();
});

test("route authorization runs before payload validation", async ({ request }) => {
  const response = await request.post("/api/holds", { data: {} });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
