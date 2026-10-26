import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createApiClient } from "../../src/lib/api-client";

const fixture = JSON.parse(await readFile(process.env.L2_UI_FIXTURE!, "utf8"));
const output = resolve(process.env.L2_UI_OUTPUT_DIR ?? "../../docs/tests/frontend/phase-07");
await mkdir(output, { recursive: true });
const widths = [1920, 1280, 768, 375];
async function login(page: Page, user = "nv_demo_a") {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(user);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.passwords?.[user] ?? fixture.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible();
}
async function noOverflow(page: Page) {
  await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
}
async function prepared() {
  const api = createApiClient({ baseUrl: fixture.backendUrl + "/api" });
  await api.login("nv_demo_a", fixture.password);
  const customer = await api.createCustomer({ full_name: "Khách".repeat(24), phone: "0887700001", address: "Đ".repeat(255) });
  const device = await api.createDevice(customer.customer_id, { product_id: 101, serial_no: "S".repeat(50), purchase_date: null });
  return { api, customer, device };
}

test("FE07-UI01 login bốn viewport, lỗi có mô tả và điều hướng bằng bàn phím", async ({ page }) => {
  await page.goto("/login");
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 }); await noOverflow(page);
    await page.screenshot({ path: resolve(output, "final-login-" + width + ".png"), fullPage: true });
  }
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  const username = page.getByLabel("Tên đăng nhập", { exact: true });
  await expect(username).toBeFocused(); await expect(username).toHaveAttribute("aria-invalid", "true");
  await expect(username).toHaveAccessibleDescription(/.+/);
  await username.fill("nv_demo_a"); await username.press("Tab");
  const password = page.getByLabel("Mật khẩu", { exact: true });
  await expect(password).toBeFocused(); await password.fill(fixture.password); await password.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  await page.keyboard.press("Control+Home");
  const skip = page.getByRole("link", { name: "Đến nội dung chính" });
  await skip.focus(); await expect(skip).toBeVisible(); await skip.press("Enter");
  await expect(page.getByRole("main")).toBeFocused();
  const nav = page.getByRole("link", { name: "Mở phiếu bằng ID", exact: true });
  await nav.focus(); await nav.press("Enter");
  await expect(page.getByRole("heading", { name: "Mở phiếu bằng ID" })).toBeVisible();
  await expect(page.getByRole("main")).toBeFocused();
});

test("FE07-UI02 intake ba/hai/một cột, dữ liệu dài và focus lỗi phân loại", async ({ page }) => {
  const { device } = await prepared();
  await login(page);
  await page.getByLabel("Số điện thoại tra cứu").fill("0887700001");
  await page.getByRole("button", { name: "Tra cứu", exact: true }).click();
  await page.getByRole("button", { name: "Chọn thiết bị " + device.serial_no, exact: true }).click();
  await expect(page.getByTestId("warranty-preview")).toBeVisible();
  await expect(page.getByLabel("Nhóm sự cố")).toBeEnabled();
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 }); await noOverflow(page);
    const selection = (await page.locator(".intake-selection").boundingBox())!;
    const fields = (await page.locator(".classification-fields").boundingBox())!;
    const review = (await page.locator(".classification-review").boundingBox())!;
    if (width >= 1280) { expect(fields.x).toBeGreaterThan(selection.x); expect(review.x).toBeGreaterThan(fields.x); expect(Math.abs(review.y - fields.y)).toBeLessThan(2); }
    else if (width === 768) { expect(fields.x).toBeGreaterThan(selection.x); expect(Math.abs(review.x - fields.x)).toBeLessThan(2); }
    else { expect(Math.abs(fields.x - selection.x)).toBeLessThan(2); expect(review.y).toBeGreaterThan(fields.y); }
    expect((await page.getByLabel("Số điện thoại tra cứu").boundingBox())!.width).toBeGreaterThan(140);
    await page.screenshot({ path: resolve(output, "final-intake-" + width + ".png"), fullPage: true, mask: [page.getByLabel("Số điện thoại tra cứu")] });
  }
  await page.getByRole("button", { name: "Tạo phiếu bảo hành", exact: true }).click();
  const issue = page.getByLabel("Mô tả lỗi", { exact: true });
  await expect(issue).toBeFocused(); await expect(issue).toHaveAttribute("aria-invalid", "true");
  await expect(issue).toHaveAccessibleDescription(/.+/);
  const category = page.getByLabel("Nhóm sự cố");
  await expect(category).toHaveAttribute("aria-invalid", "true");
  expect(await category.evaluate(e => getComputedStyle(e).borderColor)).toBe("rgb(167, 47, 54)");
  await page.screenshot({ path: resolve(output, "final-intake-errors-375.png"), fullPage: true, mask: [page.getByLabel("Số điện thoại tra cứu")] });
});

test("FE07-UI03 chi tiết giữ nguyên text dài, xuống dòng và HTML là văn bản", async ({ page }) => {
  const api = createApiClient({ baseUrl: fixture.backendUrl + "/api" }); await api.login("nv_demo_a", fixture.password);
  const customer = await api.createCustomer({ full_name: "Khách dài", phone: "0887700002" });
  const device = await api.createDevice(customer.customer_id, { product_id: 101, serial_no: "FE07-LONG-TEXT", purchase_date: null });
  const issue = "<img src=x onerror=alert(1)>\n" + "😀".repeat(1900);
  const ticket = await api.createTicket({ customer_id: customer.customer_id, device_id: device.device_id, center_id: 1, issue_desc: issue, category_id: 3, priority: "CAO" });
  const content = "<script>alert(1)</script>\n" + "N".repeat(1900); await api.communicate(ticket.ticket_id, content);
  await page.goto("/tickets/" + ticket.ticket_id);
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("ql_demo_a");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.locator(".ticket-information .preserve-lines")).toHaveText(issue);
  await expect(page.locator(".communication-list p")).toHaveText(content);
  await expect(page.locator(".ticket-information img, .communication-list script")).toHaveCount(0);
  for (const width of widths) {
    await page.setViewportSize({ width, height: 1000 }); await noOverflow(page);
    await page.screenshot({ path: resolve(output, "final-long-detail-" + width + ".png"), fullPage: true });
  }
});

test("FE07-UI04 bảng cuộn nội bộ bằng bàn phím, focus rõ và header đủ tám cột", async ({ page }) => {
  await login(page, "ql_demo_a"); await expect(page.locator(".ticket-table tbody tr")).not.toHaveCount(0);
  await expect(page.locator(".ticket-table th")).toHaveCount(8);
  await page.setViewportSize({ width: 375, height: 1000 }); await noOverflow(page);
  const table = page.getByRole("region", { name: "Bảng phiếu chưa xác minh", exact: true });
  await expect(table).toHaveAccessibleDescription(/cuộn ngang/);
  await table.focus(); await table.press("ArrowRight");
  await expect.poll(() => table.evaluate(e => e.scrollLeft)).toBeGreaterThan(0);
  expect(await table.evaluate(e => getComputedStyle(e).outlineStyle)).toBe("solid");
  await page.screenshot({ path: resolve(output, "final-queue-keyboard-375.png"), fullPage: true });
});
