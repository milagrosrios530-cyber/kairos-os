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

test("public availability is accessible without login and does not expose customer data", async ({ context, page }) => {
  test.skip(
    !process.env.E2E_BASE_URL,
    "La lectura pública requiere los secretos del backend desplegado.",
  );
  await context.grantPermissions(["clipboard-read", "clipboard-write"]);
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "share", {
      configurable: true,
      value: undefined,
    });
  });
  await page.goto("/disponibilidad?mes=2026-12");
  await expect(page.getByRole("heading", { name: "Fechas reservadas" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Diciembre de 2026" })).toBeVisible();
  await expect(page.getByText("Reservado", { exact: true })).toBeVisible();
  await expect(page.locator("span:visible").filter({ hasText: "12:00" }).first()).toBeVisible();
  await expect(page.locator("span:visible").filter({ hasText: "22:00" }).first()).toBeVisible();
  await expect(page.getByText("Ivon Artica Cuadrado")).toHaveCount(0);
  await expect(page.getByText("S/ 5,500")).toHaveCount(0);
  const reservedDay = page.locator('[data-calendar-day="2026-12-12"]');
  const reservedCard = reservedDay.locator('[data-reservation-status="reserved"]');
  const [dayBox, cardBox] = await Promise.all([
    reservedDay.boundingBox(),
    reservedCard.boundingBox(),
  ]);
  expect(dayBox).not.toBeNull();
  expect(cardBox).not.toBeNull();
  expect((cardBox?.x ?? 0) + (cardBox?.width ?? 0)).toBeLessThanOrEqual(
    (dayBox?.x ?? 0) + (dayBox?.width ?? 0) + 1,
  );
  await page.getByRole("button", { name: "Compartir calendario" }).click();
  await expect(page.getByRole("button", { name: "Enlace copiado" })).toBeVisible();
  const sharedUrl = new URL(await page.evaluate(() => navigator.clipboard.readText()));
  expect(sharedUrl.pathname).toBe("/disponibilidad");
  expect(sharedUrl.searchParams.get("mes")).toBe("2026-12");
});

test("route authorization runs before payload validation", async ({ request }) => {
  const response = await request.post("/api/holds", { data: {} });
  expect(response.status()).toBe(401);
  const body = await response.json();
  expect(body.error.code).toBe("AUTHENTICATION_REQUIRED");
});
