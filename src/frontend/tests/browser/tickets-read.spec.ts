import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createApiClient } from "../../src/lib/api-client";

const fixture: { password: string; backendUrl: string; controlFile: string; statusFile: string } = JSON.parse(await readFile(process.env.L2_UI_FIXTURE!, "utf8"));
const output = resolve(process.env.L2_UI_OUTPUT_DIR ?? "../../docs/tests/frontend/phase-07");
await mkdir(output, { recursive: true });
async function restart() {
  const prior = JSON.parse(await readFile(fixture.statusFile, "utf8")), nonce = prior.nonce + 1;
  await writeFile(fixture.controlFile, JSON.stringify({ nonce, action: "restart" }));
  await expect.poll(async () => { try { const value = JSON.parse(await readFile(fixture.statusFile, "utf8")); return value.nonce === nonce && value.ok; } catch { return false; } }).toBe(true);
}
async function client(user = "nv_demo_a") {
  const api = createApiClient({ baseUrl: fixture.backendUrl + "/api" });
  const session = await api.login(user, fixture.password);
  return { api, session };
}
async function login(page: Page, user = "nv_demo_a") {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(user);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
}
async function makeTicket(suffix: number, user = "nv_demo_a") {
  const { api, session } = await client(user), phone = "088655" + String(suffix).padStart(4, "0");
  const customer = await api.createCustomer({ full_name: "Khách đọc FE05 " + suffix, phone });
  const device = await api.createDevice(customer.customer_id, { product_id: 101, serial_no: "FE05-" + suffix, purchase_date: null });
  const ticket = await api.createTicket({ customer_id: customer.customer_id, device_id: device.device_id, center_id: session.principal.active_center_id, issue_desc: "Mô tả đọc FE05 " + suffix + "\nDòng thứ hai", category_id: 3, priority: "CAO" });
  return { api, session, customer, device, ticket, phone };
}
async function openId(page: Page, id: number) {
  await page.getByRole("link", { name: "Mở phiếu bằng ID", exact: true }).click();
  await page.getByLabel("ID phiếu", { exact: true }).fill(String(id));
  await page.getByRole("button", { name: "Mở phiếu", exact: true }).click();
  await expect(page.getByTestId("ticket-code")).toBeVisible();
}
test.beforeEach(async () => { await restart(); });
test.afterEach(async () => { await restart(); });

test("FE05-UI01 QL danh sách đúng meta/sort, không N+1/catalog, giữ filter/page về từ chi tiết", async ({ page }) => {
  const { api } = await client("ql_demo_a"), expected = await api.tickets("CHO_PHE_DUYET", 2);
  expect(expected.data.length).toBeGreaterThan(0);
  const paths: string[] = [];
  page.on("request", request => { const url = new URL(request.url()); if (url.pathname.startsWith("/api/")) paths.push(url.pathname); });
  await login(page, "ql_demo_a");
  await page.getByRole("button", { name: "Trang sau", exact: true }).click();
  await expect(page.locator('[aria-label="Phân trang phiếu"]')).toContainText("Trang 2 · " + expected.meta.total + " phiếu");
  await expect(page.locator(".ticket-table tbody tr")).toHaveCount(expected.data.length);
  expect(await page.locator(".ticket-table tbody tr").evaluateAll(rows => rows.map(row => Number(row.getAttribute("data-ticket-id"))))).toEqual(expected.data.map(value => value.ticket_id));
  expect(paths.some(path => /^\/api\/tickets\/\d+$/.test(path))).toBe(false);
  expect(paths.some(path => /products|issue-categories|\/devices/.test(path))).toBe(false);
  const first = expected.data[0];
  await page.getByRole("link", { name: "Xem phiếu " + first.ticket_code, exact: true }).click();
  await expect(page.getByTestId("ticket-code")).toHaveText(first.ticket_code);
  await expect(page.getByLabel("Nội dung trao đổi")).toHaveCount(0);
  await page.getByRole("link", { name: "← Danh sách", exact: true }).click();
  await expect(page).toHaveURL(/approval_status=CHO_PHE_DUYET&page=2$/);
  await expect(page.locator('[aria-label="Phân trang phiếu"]')).toContainText("Trang 2 ·");
  await page.getByLabel("Kết quả phê duyệt", { exact: true }).selectOption("DA_PHE_DUYET");
  await expect(page).toHaveURL(/approval_status=DA_PHE_DUYET&page=1$/);
  await page.screenshot({ path: resolve(output, "queue-manager.png"), fullPage: true });
});

test("FE05-UI02 E12 đủ23 trao đổi, cũ trước, lỗi/retry độc lập không gọi lại E10", async ({ page }) => {
  const prepared = await makeTicket(20), messages = [];
  for (let index = 1; index <= 23; index++) messages.push(await prepared.api.communicate(prepared.ticket.ticket_id, "Trao đổi FE05 " + String(index).padStart(2, "0")));
  let detailReads = 0;
  page.on("request", request => { if (new URL(request.url()).pathname === "/api/tickets/" + prepared.ticket.ticket_id) detailReads++; });
  await login(page); await openId(page, prepared.ticket.ticket_id);
  await expect(page.locator(".communication-list li")).toHaveCount(10);
  expect(await page.locator(".communication-list li").evaluateAll(rows => rows.map(row => Number(row.getAttribute("data-communication-id"))))).toEqual(messages.slice(0, 10).map(value => value.communication_id));
  await expect(page.locator(".communication-history")).toContainText("Người ghi #" + messages[0].created_by);
  await page.route(url => url.pathname.endsWith("/communications") && url.searchParams.get("page") === "2", route => route.abort("failed"), { times: 1 });
  await page.getByRole("button", { name: "Trao đổi sau", exact: true }).click();
  await expect(page.locator(".communication-history").getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("ticket-code")).toHaveText(prepared.ticket.ticket_code);
  await expect(page.locator(".ticket-snapshot")).toBeVisible();
  await page.locator(".communication-history").getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.locator(".communication-list li")).toHaveCount(10);
  expect(await page.locator(".communication-list li").evaluateAll(rows => rows.map(row => Number(row.getAttribute("data-communication-id"))))).toEqual(messages.slice(10, 20).map(value => value.communication_id));
  await page.getByRole("button", { name: "Trao đổi sau", exact: true }).click();
  await expect(page.locator('[aria-label="Phân trang trao đổi"]')).toContainText("Trang 3 · 23 trao đổi");
  await expect(page.locator(".communication-list li")).toHaveCount(3);
  await expect(page.getByRole("button", { name: "Trao đổi sau", exact: true })).toBeDisabled();
  expect(detailReads).toBe(1);
  await page.screenshot({ path: resolve(output, "history-page-3.png"), fullPage: true });
});

test("FE05-UI03 snapshot bất biến sau PATCH/soft delete; NV phone che, QL phone theo server", async ({ page }) => {
  const prepared = await makeTicket(30);
  await prepared.api.communicate(prepared.ticket.ticket_id, "Trao đổi vẫn đọc sau ngừng hồ sơ");
  const headers = { Authorization: "Bearer " + prepared.session.access_token, "Content-Type": "application/json" };
  const devicePath = fixture.backendUrl + "/api/customers/" + prepared.customer.customer_id + "/devices/" + prepared.device.device_id;
  expect((await fetch(devicePath, { method: "PATCH", headers, body: JSON.stringify({ purchase_date: "2026-09-01" }) })).status).toBe(200);
  expect((await fetch(fixture.backendUrl + "/api/customers/" + prepared.customer.customer_id, { method: "DELETE", headers: { Authorization: headers.Authorization } })).status).toBe(204);
  expect((await fetch(devicePath, { method: "DELETE", headers: { Authorization: headers.Authorization } })).status).toBe(204);
  const paths: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) paths.push(path); });
  await login(page); await openId(page, prepared.ticket.ticket_id);
  const detail = await prepared.api.detail(prepared.ticket.ticket_id);
  await expect(page.getByTestId("ticket-phone")).toHaveText(detail.customer.phone);
  expect(detail.customer.phone).not.toBe(prepared.phone);
  await expect(page.locator(".ticket-snapshot")).toContainText("Chưa có");
  await expect(page.locator(".ticket-snapshot")).not.toContainText("2026-09-01");
  await expect(page.getByTestId("due-date")).toHaveAttribute("datetime", prepared.ticket.due_date);
  await expect(page.getByText("Trao đổi vẫn đọc sau ngừng hồ sơ", { exact: true })).toBeVisible();
  expect(paths.some(path => path.includes("/devices") || path.includes("/customers"))).toBe(false);
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click(); await login(page, "ql_demo_a");
  await page.goto("/tickets/" + prepared.ticket.ticket_id); // Tải lại cần login lại rồi mới đọc.
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toBeVisible();
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("ql_demo_a"); await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByTestId("ticket-phone")).toHaveText(prepared.phone);
  await page.screenshot({ path: resolve(output, "detail-snapshot.png"), fullPage: true });
});

test("FE05-UI04 ID sai không GET, ngoài scope404 không lộ hồ sơ, NV không E09", async ({ page }) => {
  const outside = await makeTicket(40, "nv_demo_b"), paths: string[] = [];
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/")) paths.push(new URL(request.url()).pathname); });
  await login(page); await page.getByRole("link", { name: "Mở phiếu bằng ID", exact: true }).click();
  for (const id of ["", "0", "-1", "1.5", "9007199254740992", "BH-000001/2026"]) {
    await page.getByLabel("ID phiếu", { exact: true }).fill(id); await page.getByRole("button", { name: "Mở phiếu", exact: true }).press("Enter");
    await expect(page.getByLabel("ID phiếu", { exact: true })).toHaveAttribute("aria-invalid", "true");
    await expect(page.getByLabel("ID phiếu", { exact: true })).toBeFocused();
  }
  expect(paths.some(path => path === "/api/tickets" || /^\/api\/tickets\/\d+$/.test(path))).toBe(false);
  await page.getByLabel("ID phiếu", { exact: true }).fill(String(outside.ticket.ticket_id)); await page.getByRole("button", { name: "Mở phiếu", exact: true }).click();
  await expect(page.getByText("Không tìm thấy phiếu hoặc bạn không có quyền xem.", { exact: true })).toBeVisible();
  await expect(page.getByText(outside.customer.full_name, { exact: false })).toHaveCount(0);
  expect(paths).not.toContain("/api/tickets/" + outside.ticket.ticket_id + "/communications");
  await page.getByRole("link", { name: "← Tiếp nhận mới", exact: true }).click(); await expect(page.getByLabel("Số điện thoại tra cứu")).toBeVisible();
});

test("FE05-UI05 quay về sau duyệt hết trang cuối tự về trang hợp lệ", async ({ page }) => {
  const { api } = await client("ql_demo_a"), initial = await api.tickets(), lastPage = Math.ceil(initial.meta.total / 10);
  expect(lastPage).toBeGreaterThan(1);
  const last = await api.tickets("CHO_PHE_DUYET", lastPage);
  await login(page, "ql_demo_a");
  for (let pageNumber = 2; pageNumber <= lastPage; pageNumber++) {
    await page.getByRole("button", { name: "Trang sau", exact: true }).click();
    await expect(page.locator('[aria-label="Phân trang phiếu"]')).toContainText("Trang " + pageNumber + " ·");
  }
  await page.getByRole("link", { name: "Xem phiếu " + last.data[0].ticket_code, exact: true }).click();
  await expect(page.getByTestId("ticket-code")).toBeVisible();
  for (const ticket of last.data) await api.approve(ticket.ticket_id, null);
  await page.getByRole("link", { name: "← Danh sách", exact: true }).click();
  const current = await api.tickets(), validPage = Math.max(1, Math.ceil(current.meta.total / 10));
  await expect(page).toHaveURL(new RegExp("approval_status=CHO_PHE_DUYET&page=" + validPage + "$"));
  await expect(page.locator('[aria-label="Phân trang phiếu"]')).toContainText("Trang " + validPage + " · " + current.meta.total + " phiếu");
  await expect(page.locator(".ticket-table tbody tr")).not.toHaveCount(0);
});

test("FE05-UI06 phân biệt toàn bộ rỗng/bộ lọc rỗng và probe lỗi không kết luận thiếu dữ liệu", async ({ page }) => {
  await login(page, "ql_empty");
  await expect(page.getByText("Chưa có phiếu chưa xác minh bảo hành trong phạm vi của bạn.", { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất", exact: true }).click();
  const { api } = await client("ql_demo_a");
  const pending = await api.tickets("CHO_PHE_DUYET", 1, 100);
  expect(pending.meta.total).toBeLessThanOrEqual(100);
  for (const ticket of pending.data) await api.approve(ticket.ticket_id, null);
  await login(page, "ql_demo_a");
  await expect(page.getByText("Không có phiếu phù hợp với lựa chọn hiện tại.", { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(output, "queue-filter-empty.png"), fullPage: true });
  await page.route(url => url.pathname === "/api/tickets" && url.searchParams.get("approval_status") === "DA_PHE_DUYET" && url.searchParams.get("size") === "1", route => route.abort("failed"), { times: 1 });
  await page.getByRole("button", { name: "Làm mới danh sách", exact: true }).click();
  await expect(page.getByText("Không có phiếu theo lựa chọn hiện tại.", { exact: true })).toBeVisible();
  await expect(page.getByText("Chưa có phiếu chưa xác minh bảo hành trong phạm vi của bạn.", { exact: true })).toHaveCount(0);
  await page.getByLabel("Kết quả phê duyệt", { exact: true }).selectOption("DA_PHE_DUYET");
  await expect(page.locator(".ticket-table tbody tr")).not.toHaveCount(0);
});

test("FE05-UI07 đổi ID khi history cũ về muộn không lẫn phiếu hoặc draft ghi", async ({ page }) => {
  const first = await makeTicket(70), second = await makeTicket(71);
  await first.api.communicate(first.ticket.ticket_id, "Nội dung chỉ của phiếu cũ");
  const gate = Promise.withResolvers<void>();
  await page.route("**/api/tickets/" + first.ticket.ticket_id + "/communications?*", async route => { const response = await route.fetch(); await gate.promise; await route.fulfill({ response }); }, { times: 1 });
  await login(page); await openId(page, first.ticket.ticket_id);
  await expect(page.locator(".communication-history").getByRole("status")).toBeVisible();
  await page.getByLabel("Nội dung trao đổi").fill("Bản nhập của phiếu cũ");
  await openId(page, second.ticket.ticket_id); gate.resolve();
  await expect(page.getByTestId("ticket-code")).toHaveText(second.ticket.ticket_code);
  await expect(page.getByLabel("Nội dung trao đổi")).toHaveValue("");
  await expect(page.getByText("Nội dung chỉ của phiếu cũ", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Phiếu chưa có trao đổi.", { exact: true })).toBeVisible();
});

test("FE05-UI08 responsive bảng/chi tiết, time đúng định dạng và reload guard trước GET", async ({ page }) => {
  const prepared = await makeTicket(80), paths: string[] = [];
  await login(page, "ql_demo_a");
  await expect(page.locator(".ticket-table tbody tr")).not.toHaveCount(0);
  for (const width of [1920, 1280, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: resolve(output, "queue-" + width + ".png"), fullPage: true });
  }
  const table = page.getByRole("region", { name: "Bảng phiếu chưa xác minh", exact: true }); await table.focus(); await table.press("ArrowRight");
  await page.getByRole("link", { name: "Xem phiếu " + prepared.ticket.ticket_code, exact: true }).click();
  await expect(page.getByTestId("due-date")).toHaveAttribute("datetime", prepared.ticket.due_date);
  await expect(page.getByTestId("due-date")).toHaveText(/^\d{2}\/\d{2}\/\d{4} \d{2}:\d{2}$/);
  for (const width of [1920, 1280, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: resolve(output, "detail-" + width + ".png"), fullPage: true });
  }
  page.on("request", request => { if (new URL(request.url()).pathname.startsWith("/api/tickets")) paths.push(new URL(request.url()).pathname); });
  await page.reload(); await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toBeVisible(); expect(paths).toEqual([]);
});
