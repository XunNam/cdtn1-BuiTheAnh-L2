import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { ApiError, createApiClient } from "../../src/lib/api-client";

const fixture: { password: string; backendUrl: string; controlFile: string; statusFile: string } =
  JSON.parse(await readFile(process.env.L2_UI_FIXTURE!, "utf8"));
const output = resolve(process.env.L2_UI_OUTPUT_DIR ?? "../../docs/tests/frontend/phase-07");
await mkdir(output, { recursive: true });

async function control(action: "pause" | "resume" | "restart") {
  const prior = JSON.parse(await readFile(fixture.statusFile, "utf8"));
  const nonce = prior.nonce + 1;
  await writeFile(fixture.controlFile, JSON.stringify({ nonce, action }));
  await expect.poll(async () => {
    try { const value = JSON.parse(await readFile(fixture.statusFile, "utf8")); return value.nonce === nonce && value.ok; }
    catch { return false; }
  }).toBe(true);
}

async function fillLogin(page: Page, username = "nv_demo_a", password = fixture.password) {
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(password);
}

test.beforeEach(async ({ page }) => {
  await control("restart");
  await page.goto("/login");
  await expect(page.getByRole("heading", { name: "Mekong Mobile — Đăng nhập" })).toBeVisible();
});

test.afterEach(async ({ context }) => {
  await context.setOffline(false);
  await control("restart");
});

test("FE02-UI01 field validation/focus và biên Unicode, không gửi input sai", async ({ page }) => {
  for (const width of [1280, 768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: resolve(output, "login-" + width + ".png"), fullPage: true });
  }
  let posts = 0;
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/auth/login") posts++; });
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toBeFocused();
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByText("Vui lòng nhập mật khẩu.", { exact: true })).toBeVisible();
  expect(posts).toBe(0);
  await fillLogin(page, "😀".repeat(65), "valid");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByText("Tên đăng nhập tối đa 64 ký tự.", { exact: true })).toBeVisible();
  expect(posts).toBe(0);
  await fillLogin(page, "nv_demo_a", "😀".repeat(257));
  await page.getByLabel("Mật khẩu", { exact: true }).press("Enter");
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeFocused();
  await expect(page.getByText("Mật khẩu tối đa 256 ký tự.", { exact: true })).toBeVisible();
  expect(posts).toBe(0);
  await page.screenshot({ path: resolve(output, "login-validation-mobile.png"), fullPage: true });
  await fillLogin(page, "😀".repeat(64), "😀".repeat(256));
  const status = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/login");
  await page.getByLabel("Mật khẩu", { exact: true }).press("Enter");
  expect((await status).status()).toBe(401); // Đúng biên validation, nhưng không phải credential có thật.
  expect(posts).toBe(1);
  await expect(page.getByRole("alert", { name: "Lỗi đăng nhập" })).toContainText("Thông tin đăng nhập không hợp lệ");
});

test("FE02-UI02 hiện/ẩn, Enter, busy chống gửi lặp; username trim và password giữ nguyên", async ({ page }) => {
  await expect(page.locator("form")).toHaveAttribute("method", "post");
  const gate = Promise.withResolvers<void>();
  let posts = 0;
  let correctPayload = false;
  let noAuthorization = false;
  await page.route("**/api/auth/login", async route => {
    posts++;
    const body: unknown = route.request().postDataJSON();
    correctPayload = Boolean(body && typeof body === "object" && !Array.isArray(body)
      && Reflect.get(body, "username") === "nv_demo_a" && Reflect.get(body, "password") === fixture.password
      && Object.keys(body).length === 2);
    noAuthorization = route.request().headers().authorization === undefined;
    await gate.promise;
    await route.continue();
  }, { times: 1 });
  await fillLogin(page, " \uFEFFnv_demo_a  ");
  const password = page.getByLabel("Mật khẩu", { exact: true });
  await expect(password).toHaveAttribute("type", "password");
  await page.getByRole("button", { name: "Hiện mật khẩu", exact: true }).click();
  await expect(password).toHaveAttribute("type", "text");
  expect((await password.inputValue()) === fixture.password).toBe(true);
  await page.getByRole("button", { name: "Ẩn mật khẩu", exact: true }).press("Space");
  await expect(password).toHaveAttribute("type", "password");
  await password.press("Enter");
  await expect(page.getByRole("button", { name: "Đang đăng nhập…", exact: true })).toBeDisabled();
  await expect(password).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hiện mật khẩu", exact: true })).toBeDisabled();
  await page.locator("form").evaluate(form => form.dispatchEvent(new Event("submit", { bubbles: true, cancelable: true })));
  expect(posts).toBe(1);
  await page.screenshot({ path: resolve(output, "login-loading.png"), fullPage: true });
  gate.resolve();
  await expect(page).toHaveURL(/\/intake$/);
  expect(correctPayload).toBe(true); // So boolean để không đưa password vào assertion diff/log.
  expect(noAuthorization).toBe(true);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  await expect(password).toHaveAttribute("type", "password");
  expect((await password.inputValue()) === "").toBe(true);
});

test("FE02-UI03 sai credential401 chung, giữ username và không báo hết phiên", async ({ page }) => {
  const alert = page.getByRole("alert", { name: "Lỗi đăng nhập" });
  await fillLogin(page, "not_an_account", "invalid");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(alert).toContainText("Thông tin đăng nhập không hợp lệ");
  const firstMessage = await alert.innerText();
  await expect(alert).toBeFocused();
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toHaveValue("not_an_account");
  await expect(page.getByText(/Phiên làm việc đã hết hạn/)).toHaveCount(0);
  await fillLogin(page, "nv_demo_a", "invalid");
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(alert).toHaveText(firstMessage);
  await page.screenshot({ path: resolve(output, "login-invalid-credentials.png"), fullPage: true });
  await fillLogin(page, "ql_demo_a");
  await page.getByLabel("Mật khẩu", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByLabel("Kết quả phê duyệt")).toBeVisible();
});

test("FE02-UI04 lỗi400 thật gắn field và focus; người dùng sửa rồi đăng nhập lại", async ({ page }) => {
  // Làm request thiếu password tới Express thật; không giả response validation.
  await page.route("**/api/auth/login", async route => {
    await route.continue({ postData: JSON.stringify({ username: "nv_demo_a" }) });
  }, { times: 1 });
  await fillLogin(page);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Mật khẩu", { exact: true })).toBeFocused();
  await expect(page.locator("#login-password-error")).toContainText("Thiếu trường bắt buộc");
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toHaveValue("nv_demo_a");
  await page.getByLabel("Mật khẩu", { exact: true }).press("Enter");
  await expect(page).toHaveURL(/\/intake$/);
});

test("FE02-UI05 lỗi mạng và backend offline503, giữ form để chủ động thử lại", async ({ page, context }) => {
  await fillLogin(page);
  await context.setOffline(true);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Lỗi đăng nhập" })).toContainText("Không thể kết nối máy chủ");
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeEnabled();
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toHaveValue("nv_demo_a");
  expect((await page.getByLabel("Mật khẩu", { exact: true }).inputValue()) === fixture.password).toBe(true);
  await page.screenshot({ path: resolve(output, "login-offline.png"), fullPage: true });
  await context.setOffline(false);
  await control("pause");
  const status = page.waitForResponse(response => new URL(response.url()).pathname === "/api/auth/login");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  expect((await status).status()).toBe(503);
  await expect(page.getByRole("alert", { name: "Lỗi đăng nhập" })).toContainText("Không thể kết nối máy chủ");
  await control("resume");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page).toHaveURL(/\/intake$/);
});

test("FE02-UI06 đầy session503 thật, thông báo riêng và thử lại được sau restart", async ({ page }) => {
  const api = createApiClient({ baseUrl: fixture.backendUrl + "/api" });
  let issued = 0;
  let reached = false;
  for (let index = 0; index <= 100; index++) {
    try { await api.login("nv_demo_a", fixture.password); issued++; }
    catch (error) {
      if (!(error instanceof ApiError) || error.code !== "AUTH_CAPACITY_REACHED") throw error;
      reached = true;
      break;
    }
  }
  expect(issued).toBe(100);
  expect(reached).toBe(true);
  let posts = 0;
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname === "/api/auth/login") posts++; });
  await fillLogin(page);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Lỗi đăng nhập" })).toContainText("Hệ thống đã đạt giới hạn phiên đăng nhập");
  await expect(page.getByRole("button", { name: "Thử lại", exact: true })).toBeEnabled();
  expect(posts).toBe(1);
  await page.screenshot({ path: resolve(output, "login-capacity.png"), fullPage: true });
  await control("restart");
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page).toHaveURL(/\/intake$/);
  expect(posts).toBe(2);
});
