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

test("public availability is accessible without login and does not expose customer data", async ({ page }) => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "La lectura pública requiere los secretos del backend desplegado.",
  );
  await page.goto("/disponibilidad?mes=2026-12");
  await expect(page.getByRole("heading", { name: "Fechas reservadas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Diciembre de 2026" })).toBeVisible();
  await expect(page.getByText("Reservado", { exact: true })).toBeVisible();
  await expect(page.getByText("12:00–22:00", { exact: true })).toBeVisible();
  await expect(page.getByText("Ivon Artica Cuadrado")).toHaveCount(0);
  await expect(page.getByText("S/ 5,500")).toHaveCount(0);
});

test("route authorization runs before payload validation", async ({ request }) => {
  const response = await request.post("/api/holds", { data: {} });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
