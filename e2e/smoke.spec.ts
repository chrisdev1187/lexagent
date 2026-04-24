import { test, expect } from "@playwright/test";

const BASE = process.env.E2E_BASE_URL ?? "https://lexagent-ochre.vercel.app";
const TEST_EMAIL = process.env.E2E_EMAIL ?? "";
const TEST_PASSWORD = process.env.E2E_PASSWORD ?? "";

test.describe("Landing + Auth", () => {
  test("landing page loads with hero CTA", async ({ page }) => {
    await page.goto(BASE);
    await expect(page.locator("h1")).toBeVisible();
    await expect(page.getByRole("link", { name: /get started|sign up/i }).first()).toBeVisible();
  });

  test("pricing page renders tier table", async ({ page }) => {
    await page.goto(`${BASE}/pricing`);
    await expect(page.getByText(/starter/i).first()).toBeVisible();
    await expect(page.getByText(/professional/i).first()).toBeVisible();
  });

  test("/legal/privacy renders", async ({ page }) => {
    await page.goto(`${BASE}/legal/privacy`);
    await expect(page.getByRole("heading", { name: /privacy policy/i })).toBeVisible();
  });

  test("/legal/terms renders", async ({ page }) => {
    await page.goto(`${BASE}/legal/terms`);
    await expect(page.getByRole("heading", { name: /terms of service/i })).toBeVisible();
  });

  test("/status page loads and shows services", async ({ page }) => {
    await page.goto(`${BASE}/status`);
    await expect(page.getByText(/API/)).toBeVisible();
    await expect(page.getByText(/Frontend/)).toBeVisible();
  });

  test("unauthenticated /dashboard redirects to /login", async ({ page }) => {
    await page.goto(`${BASE}/dashboard`);
    await page.waitForURL(/\/login/);
    await expect(page.url()).toContain("/login");
  });
});

test.describe("Authenticated flows", () => {
  test.skip(!TEST_EMAIL || !TEST_PASSWORD, "E2E_EMAIL / E2E_PASSWORD not set");

  test.beforeEach(async ({ page }) => {
    await page.goto(`${BASE}/login`);
    await page.getByLabel(/email/i).fill(TEST_EMAIL);
    await page.getByLabel(/password/i).fill(TEST_PASSWORD);
    await page.getByRole("button", { name: /sign in|log in/i }).click();
    await page.waitForURL(/\/dashboard/);
  });

  test("dashboard loads with matter list or empty state", async ({ page }) => {
    await expect(page.getByRole("heading", { name: /dashboard|matters/i }).first()).toBeVisible();
  });

  test("can open new matter modal", async ({ page }) => {
    await page.getByRole("button", { name: /new matter/i }).click();
    await expect(page.getByRole("dialog")).toBeVisible();
    await expect(page.getByLabel(/title/i)).toBeVisible();
    await page.keyboard.press("Escape");
  });

  test("admin can reach /admin", async ({ page }) => {
    test.skip(
      !TEST_EMAIL.includes("christiaanbothma47") && !TEST_EMAIL.includes("drwillybum"),
      "Non-admin account"
    );
    await page.goto(`${BASE}/admin`);
    await expect(page.getByRole("heading", { name: /admin/i })).toBeVisible();
  });

  test("/changelog loads with version", async ({ page }) => {
    await page.goto(`${BASE}/changelog`);
    await expect(page.getByText(/0\.\d+\.\d+|1\.0\.0/)).toBeVisible();
  });
});

test.describe("API health", () => {
  test("keep-alive endpoint responds ok", async ({ request }) => {
    const res = await request.get(`${BASE}/api/keep-alive`);
    expect(res.ok()).toBeTruthy();
    const body = await res.json();
    expect(body.ok).toBe(true);
  });
});
