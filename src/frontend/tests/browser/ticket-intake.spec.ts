import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createApiClient } from "../../src/lib/api-client";
import * as dto from "../../src/lib/contracts";

const fixture: { password: string; backendUrl: string; controlFile: string; statusFile: string } = JSON.parse(await readFile(process.env.L2_UI_FIXTURE!, "utf8"));
const output = resolve(process.env.L2_UI_OUTPUT_DIR ?? "../../docs/tests/frontend/phase-07");
await mkdir(output, { recursive: true });
async function control(action: string, extra: Record<string, unknown> = {}) {
  const prior = JSON.parse(await readFile(fixture.statusFile, "utf8"));
  const nonce = prior.nonce + 1;
  await writeFile(fixture.controlFile, JSON.stringify({ nonce, action, ...extra }));
  await expect.poll(async () => { try { const value = JSON.parse(await readFile(fixture.statusFile, "utf8")); return value.nonce === nonce && value.ok; } catch { return false; } }).toBe(true);
}
async function clock(instant: string) { await control("clock", { instant }); }
async function client() {
  const api = createApiClient({ baseUrl: fixture.backendUrl + "/api" });
  const session = await api.login("nv_demo_a", fixture.password);
  return { api, session };
}
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("nv_demo_a");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByLabel("Số điện thoại tra cứu")).toBeVisible();
}
async function selectDevice(page: Page, phone: string, serial: string) {
  await page.getByLabel("Số điện thoại tra cứu").fill(phone);
  await page.getByRole("button", { name: "Tra cứu", exact: true }).click();
  await page.getByRole("button", { name: "Chọn thiết bị " + serial, exact: true }).click();
  await expect(page.getByLabel("Nhóm sự cố", { exact: true })).toBeVisible();
  await expect(page.getByTestId("warranty-preview")).toBeVisible();
}
async function prepare(page: Page, suffix: number, purchase: string | null = null, product = 101) {
  const { api, session } = await client();
  const phone = "088644" + String(suffix).padStart(4, "0"), serial = "FE04-" + suffix;
  const customer = await api.createCustomer({ full_name: "Khách FE04 " + suffix, phone });
  const device = await api.createDevice(customer.customer_id, { product_id: product, serial_no: serial, purchase_date: purchase });
  await selectDevice(page, phone, serial);
  return { api, session, customer, device, phone, serial };
}
async function classify(page: Page, issue = "Máy không nhận sạc", priority = "CAO") {
  await page.getByLabel("Mô tả lỗi", { exact: true }).fill(issue);
  await page.getByLabel("Nhóm sự cố", { exact: true }).selectOption("3");
  await page.getByLabel("Mức ưu tiên", { exact: true }).selectOption(priority);
}
const createButton = (page: Page) => page.getByRole("button", { name: "Tạo phiếu bảo hành", exact: true });
async function create(page: Page) {
  const response = page.waitForResponse(value => value.request().method() === "POST" && new URL(value.url()).pathname === "/api/tickets");
  await createButton(page).click();
  const saved = dto.ticket(dto.record(await (await response).json()).data);
  await expect(page.getByTestId("ticket-receipt")).toBeVisible();
  return saved;
}
test.beforeEach(async ({ page }) => { await control("restart"); await login(page); });
test.afterEach(async () => { await control("restart"); });

test("FE04-UI01 field/focus, Unicode2000, không default;400 thật giữ draft rồi tạo201", async ({ page }) => {
  await prepare(page, 1);
  let posts = 0;
  page.on("request", value => { if (value.method() === "POST" && new URL(value.url()).pathname === "/api/tickets") posts++; });
  await expect(page.getByLabel("Nhóm sự cố", { exact: true })).toHaveValue("");
  await expect(page.getByLabel("Mức ưu tiên", { exact: true })).toHaveValue("");
  await createButton(page).click();
  await expect(page.getByText("Vui lòng nhập mô tả lỗi.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Mô tả lỗi", { exact: true })).toBeFocused();
  await page.getByLabel("Mô tả lỗi", { exact: true }).fill(" \t\n "); await createButton(page).click();
  expect(posts).toBe(0);
  await page.getByLabel("Mô tả lỗi", { exact: true }).fill("x"); await createButton(page).click();
  await expect(page.getByLabel("Nhóm sự cố", { exact: true })).toBeFocused();
  await page.getByLabel("Nhóm sự cố", { exact: true }).selectOption("3"); await createButton(page).click();
  await expect(page.getByLabel("Mức ưu tiên", { exact: true })).toBeFocused();
  await page.setViewportSize({ width: 375, height: 900 });
  await page.screenshot({ path: resolve(output, "classification-validation-375.png"), fullPage: true });
  await classify(page, "😀".repeat(2001)); await createButton(page).click();
  await expect(page.getByText("Mô tả lỗi tối đa 2000 ký tự.", { exact: true })).toBeVisible(); expect(posts).toBe(0);
  await page.getByLabel("Mô tả lỗi", { exact: true }).fill("😀".repeat(2000));
  await page.route("**/api/tickets", async route => {
    const body = route.request().postDataJSON(); delete body.priority;
    await route.continue({ postData: JSON.stringify(body) });
  }, { times: 1 });
  await createButton(page).click();
  await expect(page.getByLabel("Mức ưu tiên", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Mô tả lỗi", { exact: true })).toHaveValue("😀".repeat(2000));
  await expect(page.getByLabel("Nhóm sự cố", { exact: true })).toHaveValue("3");
  const saved = await create(page);
  expect(Array.from(saved.issue_desc).length).toBe(2000); expect(posts).toBe(2);
});

test("FE04-UI02 còn/hết/thiếu mua, biên hết hạn và SLA thứ Bảy/Chủ nhật từ server", async ({ page }) => {
  const cases = [
    { suffix: 20, instant: "2026-09-28T09:00:00+07:00", purchase: "2026-09-01", priority: "CAO", status: "CON_BAO_HANH", due: "2026-09-29T09:00:00+07:00" },
    { suffix: 21, instant: "2026-09-30T09:00:00+07:00", purchase: "2025-09-30", priority: "TRUNG_BINH", status: "CON_BAO_HANH", due: "2026-10-03T09:00:00+07:00" },
    { suffix: 22, instant: "2026-10-01T09:00:00+07:00", purchase: "2025-09-30", priority: "THAP", status: "HET_BAO_HANH", due: "2026-10-07T09:00:00+07:00" },
    { suffix: 23, instant: "2026-10-03T23:00:00+07:00", purchase: null, priority: "CAO", status: "CHUA_XAC_MINH", due: "2026-10-05T23:00:00+07:00" },
    { suffix: 24, instant: "2026-10-04T10:00:00+07:00", purchase: null, priority: "CAO", status: "CHUA_XAC_MINH", due: "2026-10-06T00:00:00+07:00" },
  ];
  for (const item of cases) {
    await clock(item.instant);
    if (item.suffix !== 20) await page.getByRole("button", { name: "Tiếp nhận mới", exact: true }).click();
    await prepare(page, item.suffix, item.purchase);
    await expect(page.getByTestId("warranty-preview")).toContainText(item.instant.slice(0, 10));
    await expect(page.locator(".intake-summary")).toContainText("Được xác định khi tạo phiếu");
    await classify(page, "Kiểm tra bảo hành và SLA", item.priority);
    const saved = await create(page);
    expect(saved.status).toBe("MOI"); expect(saved.warranty_status).toBe(item.status); expect(Date.parse(saved.due_date)).toBe(Date.parse(item.due));
    expect(saved.can_proceed).toBe(item.purchase !== null);
    expect(saved.approval_status).toBe(item.purchase === null ? "CHO_PHE_DUYET" : "KHONG_CAN");
    await expect(page.getByTestId("receipt-due")).toHaveAttribute("datetime", saved.due_date);
    await expect(page.getByTestId("receipt-due")).toHaveText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
    if (item.suffix === 22) await page.screenshot({ path: resolve(output, "ticket-expired.png"), fullPage: true });
    if (item.suffix === 24) await page.screenshot({ path: resolve(output, "ticket-pending.png"), fullPage: true });
  }
});

test("FE04-UI03 preview khác ngày tạo: dùng snapshot mới, payload chỉ6 field và không assessment_date", async ({ page }) => {
  await clock("2026-09-30T23:59:00+07:00");
  const paths: string[] = []; let payload: Record<string, unknown> | undefined;
  page.on("request", value => {
    const url = new URL(value.url());
    if (url.pathname.endsWith("/warranty")) paths.push(url.search);
    if (value.method() === "POST" && url.pathname === "/api/tickets") payload = value.postDataJSON();
  });
  const fixture = await prepare(page, 30, "2025-09-30");
  await expect(page.getByTestId("warranty-preview")).toContainText("Còn bảo hành");
  await clock("2026-10-01T00:01:00+07:00"); await classify(page);
  const saved = await create(page);
  expect(paths).toEqual([""]);
  expect(payload).toEqual({ customer_id: fixture.customer.customer_id, device_id: fixture.device.device_id, center_id: 1, issue_desc: "Máy không nhận sạc", category_id: 3, priority: "CAO" });
  expect(saved.warranty_status).toBe("HET_BAO_HANH"); expect(saved.assessed_on).toBe("2026-10-01");
  await expect(page.getByTestId("receipt-warranty")).toHaveText("Hết bảo hành");
  await expect(page.getByTestId("ticket-receipt")).toContainText("2026-10-01");
});

test("FE04-UI04 nhóm rỗng/lỗi và preview lỗi độc lập, retry giữ mô tả", async ({ page }) => {
  await control("empty-categories"); await prepare(page, 40);
  await expect(page.getByText("Chưa có nhóm sự cố đang sử dụng. Chưa thể tạo phiếu.", { exact: true })).toBeVisible();
  await expect(createButton(page)).toBeDisabled();
  await page.getByLabel("Mô tả lỗi", { exact: true }).fill("Giữ bản nhập khi tải lại");
  await page.screenshot({ path: resolve(output, "classification-empty.png"), fullPage: true });
  await control("restore-categories");
  await page.route("**/api/issue-categories", route => route.abort("failed"), { times: 1 });
  await page.getByRole("button", { name: "Tải lại nhóm sự cố", exact: true }).click();
  await expect(page.locator(".category-region").getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("warranty-preview")).toBeVisible();
  await page.locator(".category-region").getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByLabel("Mô tả lỗi", { exact: true })).toHaveValue("Giữ bản nhập khi tải lại");
  await page.getByRole("button", { name: "Bỏ chọn thiết bị", exact: true }).click();
  await page.route("**/api/devices/*/warranty", route => route.abort("failed"), { times: 1 });
  await page.getByRole("button", { name: "Chọn thiết bị FE04-40", exact: true }).click();
  await expect(page.locator(".warranty-region").getByRole("alert")).toBeVisible();
  await classify(page, "Bản nhập khi bảo hành lỗi"); await expect(createButton(page)).toBeDisabled();
  await page.locator(".warranty-region").getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(createButton(page)).toBeEnabled();
  await expect(page.getByLabel("Mô tả lỗi", { exact: true })).toHaveValue("Bản nhập khi bảo hành lỗi");
});

test("FE04-UI05 category/device ngừng sau preview: lỗi thật giữ draft, không tạo giả", async ({ page }) => {
  const prepared = await prepare(page, 50); await classify(page, "Giữ lỗi cạnh tranh");
  await control("deactivate-category", { categoryId: 3 }); await createButton(page).click();
  await expect(page.getByLabel("Nhóm sự cố", { exact: true })).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Mô tả lỗi", { exact: true })).toHaveValue("Giữ lỗi cạnh tranh");
  await expect(page.getByTestId("ticket-receipt")).toHaveCount(0);
  await page.getByLabel("Nhóm sự cố", { exact: true }).selectOption("1");
  const response = await fetch(fixture.backendUrl + "/api/customers/" + prepared.customer.customer_id + "/devices/" + prepared.device.device_id,
    { method: "DELETE", headers: { Authorization: "Bearer " + prepared.session.access_token } });
  expect(response.status).toBe(204); await createButton(page).click();
  await expect(page.getByText(/Khách hàng hoặc thiết bị không còn phù hợp/)).toBeVisible();
  await expect(createButton(page)).toBeDisabled();
  await expect(page.getByLabel("Mô tả lỗi", { exact: true })).toHaveValue("Giữ lỗi cạnh tranh");
});

test("FE04-UI06 busy khóa lựa chọn, click lặp/Back không gửi lại; receipt mở chi tiết và tạo tiếp", async ({ page }) => {
  await prepare(page, 60); await classify(page);
  const gate = Promise.withResolvers<void>(); let posts = 0;
  page.on("request", value => { if (value.method() === "POST" && new URL(value.url()).pathname === "/api/tickets") posts++; });
  await page.route("**/api/tickets", async route => { await gate.promise; await route.continue(); }, { times: 1 });
  await createButton(page).evaluate(button => { if (button instanceof HTMLButtonElement) { button.click(); button.click(); } });
  await expect(page.getByRole("button", { name: "Đang tạo phiếu…", exact: true })).toBeDisabled();
  await expect(page.getByLabel("Số điện thoại tra cứu")).toBeDisabled();
  await expect(page.getByRole("button", { name: "Bỏ chọn thiết bị", exact: true })).toBeDisabled();
  await expect(page.getByRole("button", { name: "Hủy nhập", exact: true })).toBeDisabled();
  gate.resolve(); await expect(page.getByTestId("ticket-receipt")).toBeVisible(); expect(posts).toBe(1);
  await expect(createButton(page)).toHaveCount(0);
  await page.getByRole("link", { name: "Mở chi tiết phiếu", exact: true }).click();
  await expect(page.getByTestId("ticket-status")).toHaveText("Mới"); await expect(page.getByTestId("ticket-status")).toHaveAttribute("data-value", "MOI"); await page.goBack();
  await expect(page).toHaveURL(/\/intake$/); expect(posts).toBe(1);
  if (await page.getByTestId("ticket-receipt").count()) await page.getByRole("button", { name: "Tiếp nhận mới", exact: true }).click();
  await expect(page.getByLabel("Số điện thoại tra cứu")).toHaveValue("");
  await expect(page.getByTestId("selected-device")).toHaveCount(0);
});

test("FE04-UI07 timeout10 giây sau commit: giữ bản nhập, không auto retry hoặc tạo thêm", async ({ page }) => {
  const prepared = await prepare(page, 70); await classify(page, "Phiếu mất phản hồi");
  let posts = 0; let saved: dto.Ticket | undefined;
  const gate = Promise.withResolvers<void>();
  page.on("request", value => { if (value.method() === "POST" && new URL(value.url()).pathname === "/api/tickets") posts++; });
  await page.route("**/api/tickets", async route => {
    const response = await route.fetch(); saved = dto.ticket(dto.record(await response.json()).data);
    await gate.promise;
    // Client đã timeout; response muộn không được phục hồi draft đã khóa.
    await route.fulfill({ response }).catch(() => {});
  }, { times: 1 });
  await createButton(page).click(); await expect(page.getByTestId("ticket-uncertain")).toBeVisible({ timeout: 16000 });
  await expect(page.getByTestId("ticket-uncertain")).toHaveAttribute("role", "alert");
  await expect(page.locator(".ticket-feedback")).not.toContainText("Vui lòng thử lại");
  gate.resolve();
  await expect(createButton(page)).toBeDisabled();
  await expect(page.getByLabel("Số điện thoại tra cứu")).toBeDisabled();
  await expect(page.getByLabel("Mô tả lỗi", { exact: true })).toHaveValue("Phiếu mất phản hồi");
  await expect(page.locator(".ticket-feedback").getByRole("button", { name: "Thử lại" })).toHaveCount(0);
  expect(posts).toBe(1); expect(saved).toBeDefined();
  const actual = await prepared.api.detail(saved!.ticket_id);
  expect(actual.issue_desc).toBe("Phiếu mất phản hồi");
  await page.screenshot({ path: resolve(output, "ticket-uncertain.png"), fullPage: true });
});

test("FE04-UI08 hủy draft có xác nhận, giữ customer/device đã lưu, responsive và keyboard", async ({ page }) => {
  const prepared = await prepare(page, 80); await classify(page, "Thông tin chưa lưu");
  for (const width of [1920, 1280, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: resolve(output, "classification-" + width + ".png"), fullPage: true });
  }
  page.once("dialog", dialog => dialog.dismiss()); await page.getByRole("button", { name: "Hủy nhập", exact: true }).click();
  await expect(page.getByLabel("Mô tả lỗi", { exact: true })).toHaveValue("Thông tin chưa lưu");
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Hủy nhập", exact: true }).press("Enter");
  await expect(page.getByLabel("Số điện thoại tra cứu")).toHaveValue("");
  expect((await prepared.api.customer(prepared.phone)).customer_id).toBe(prepared.customer.customer_id);
  expect((await prepared.api.devices(prepared.customer.customer_id)).data[0].device_id).toBe(prepared.device.device_id);
});

test("FE04-UI09 POST về muộn sau logout không phục hồi receipt hoặc gửi lại", async ({ page }) => {
  await prepare(page, 90); await classify(page);
  const gate = Promise.withResolvers<void>(), committed = Promise.withResolvers<void>();
  let posts = 0;
  page.on("request", value => { if (value.method() === "POST" && new URL(value.url()).pathname === "/api/tickets") posts++; });
  await page.route("**/api/tickets", async route => {
    const response = await route.fetch(); committed.resolve(); await gate.promise; await route.fulfill({ response });
  }, { times: 1 });
  await createButton(page).click(); await committed.promise;
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click(); gate.resolve();
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toBeVisible();
  await expect(page.getByTestId("ticket-receipt")).toHaveCount(0);
  await login(page); await expect(page.getByLabel("Số điện thoại tra cứu")).toHaveValue(""); expect(posts).toBe(1);
});
