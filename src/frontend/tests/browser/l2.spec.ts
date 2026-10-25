import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createApiClient } from "../../src/lib/api-client";
const fixture = JSON.parse(await readFile(process.env.L2_UI_FIXTURE!, "utf8"));
const output = resolve(process.env.L2_UI_OUTPUT_DIR ?? "../../docs/tests/frontend/phase-04");
await mkdir(output, { recursive: true });
async function login(page: Page, user: string) { await page.goto("/"); await page.getByLabel("Tên đăng nhập").fill(user); await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.passwords?.[user] ?? fixture.password); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click(); await expect(page.getByRole("button", { name: "Đăng xuất" })).toBeVisible(); }
let controlNonce = 0;
async function control(action: "pause" | "resume" | "restart") { const prior = JSON.parse(await readFile(fixture.statusFile, "utf8")); const nonce = controlNonce = Math.max(controlNonce, prior.nonce) + 1; await writeFile(fixture.controlFile, JSON.stringify({ nonce, action })); await expect.poll(async () => { try { const r = JSON.parse(await readFile(fixture.statusFile, "utf8")); return r.nonce === nonce && r.ok; } catch { return false; } }).toBe(true); }
test.afterEach(async () => { if (fixture.controlFile) await control("resume"); });
async function lookup(page: Page, phone: string) { const box = page.getByTestId("lookup-result"), old = await box.getAttribute("data-version"); await page.getByLabel("Số điện thoại tra cứu").fill(phone); await page.getByRole("button", { name: "Tra cứu", exact: true }).click(); await expect(box).not.toHaveAttribute("data-version", old ?? "0"); await expect(box).toHaveAttribute("data-result", /^(found|empty)$/); await expect(box).not.toHaveAttribute("data-ms", ""); return Number(await box.getAttribute("data-ms")); }
async function newCustomer(page: Page, phone: string) { await lookup(page, phone); await page.getByLabel("Họ tên khách hàng mới").fill("Khách trình duyệt"); await page.getByRole("button", { name: "Tạo khách hàng và chọn" }).click(); await expect(page.getByText("Khách hàng chưa có thiết bị.")).toBeVisible(); }

test("UI01 NFR01:100 lượt click→DOM render, đúng200 ticket và warm-up riêng", async ({ page, browser }) => {
  await mkdir(output, { recursive: true }); expect(fixture.environment.ticketCount).toBe(200); await login(page, "nv_demo_a");
  await lookup(page, "0990000001"); // Không tính warm-up vào100 lượt.
  const samples: { index: number; kind: string; ms: number }[] = [];
  for (let i = 0; i < 100; i++) { const exists = i % 2 === 0, ms = await lookup(page, exists ? "0990000001" : "0889999999"); samples.push({ index: i + 1, kind: exists ? "existing" : "missing", ms }); }
  const values = samples.map(x => x.ms).sort((a, b) => a - b), passed = values.filter(v => v < 1500).length;
  const result = { measuredAt: new Date().toISOString(), ...fixture.environment, browser: browser.version(), mode: "Next production / same-origin proxy / real Express+PostgreSQL; click handler to committed DOM plus2 animation frames", warmup: 1, count: 100, passed, failed: 100 - passed, percentage: passed, p50: values[49], p95: values[94], max: values[99], thresholdMs: 1500, expectedAtLeast: 95, result: passed >= 95 ? "PASS" : "FAIL", samples };
  await writeFile(resolve(output, "nfr01-local.json"), JSON.stringify(result, null, 2) + "\n"); console.log("NFR01_RENDER_RESULT " + JSON.stringify({ passed, p95: values[94], max: values[99] })); expect(passed).toBeGreaterThanOrEqual(95);
});
test("UI02 ba màn hình API thật: thiếu ngày mua→ticket→trao đổi→manager duyệt", async ({ page }) => {
  await login(page, "nv_demo_a"); await newCustomer(page, "0886660001"); await page.screenshot({ path: resolve(output, "screen-1-reception.png"), fullPage: true });
  await page.getByLabel("Sản phẩm", { exact: true }).selectOption("101"); await page.getByLabel("Serial / IMEI", { exact: true }).fill("UI-L2-FLOW"); await page.getByRole("button", { name: "Ghi nhận thiết bị", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tiếp nhận & tạo phiếu", exact: true })).toBeVisible(); await expect(page.getByText("Thiếu ngày mua: tạo phiếu Mới và chờ quản lý phê duyệt.")).toBeVisible();
  await page.getByLabel("Mô tả lỗi", { exact: true }).fill("Máy không nhận sạc"); await page.getByLabel("Nhóm sự cố").selectOption("3"); await page.getByLabel("Mức ưu tiên").selectOption("CAO");
  let posts = 0; page.on("request", r => { if (r.method() === "POST" && new URL(r.url()).pathname === "/api/tickets") posts++; });
  await page.getByRole("button", { name: "Tạo phiếu bảo hành", exact: true }).dblclick(); await expect(page.getByTestId("ticket-receipt")).toBeVisible(); expect(posts).toBe(1);
  await page.getByRole("link", { name: "Mở chi tiết phiếu", exact: true }).click(); await expect(page.getByTestId("ticket-status")).toHaveText("MOI");
  await expect(page.getByTestId("approval-status")).toHaveText("Chờ phê duyệt"); await expect(page.getByText("Phiếu chưa có trao đổi.")).toBeVisible(); await page.screenshot({ path: resolve(output, "state-empty-history.png") });
  const code = await page.locator(".detail h3").first().textContent(), due = await page.getByTestId("due-date").textContent();
  await page.getByLabel("Nội dung trao đổi").fill("Khách sẽ bổ sung hóa đơn"); await page.getByRole("button", { name: "Lưu trao đổi", exact: true }).click(); await expect(page.getByText("Khách sẽ bổ sung hóa đơn", { exact: true })).toBeVisible();
  await page.screenshot({ path: resolve(output, "screen-2-ticket.png"), fullPage: true }); await page.getByRole("button", { name: "Đăng xuất" }).click(); await login(page, "ql_demo_a");
  const open = page.getByRole("link", { name: "Xem phiếu " + code, exact: true });
  await expect(page.getByRole("button", { name: "Làm mới danh sách" })).toBeVisible();
  for (let i = 0; i < 20 && !(await open.count()); i++) {
    await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Trang sau", exact: true }).click();
    await expect(page.locator(".pagination").first()).toContainText("Trang " + (i + 2) + " ·");
  }
  await open.click(); await expect(page.getByText("Khách sẽ bổ sung hóa đơn", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Nội dung trao đổi")).toHaveCount(0); await page.getByLabel("Ghi chú phê duyệt (không bắt buộc)").fill("Cho phép tiếp tục xử lý"); await page.getByRole("button", { name: "Phê duyệt cho phép xử lý", exact: true }).click();
  await expect(page.getByTestId("approval-status")).toHaveText("Đã phê duyệt"); await expect(page.getByTestId("ticket-status")).toHaveText("MOI"); await expect(page.getByTestId("due-date")).toHaveText(due!);
  await page.screenshot({ path: resolve(output, "screen-3-approval.png"), fullPage: true });
});
test("UI03 loading/empty/error/retry cả3 màn hình, tắt Backend thật rồi phục hồi", async ({ page }) => {
  await login(page, "nv_demo_a"); let release!: () => void; const gate = new Promise<void>(r => { release = r; });
  await page.route("**/api/customers?*", async route => { await gate; await route.continue(); }, { times: 1 });
  await page.getByLabel("Số điện thoại tra cứu").fill("0886660002"); await page.getByRole("button", { name: "Tra cứu", exact: true }).click(); await expect(page.getByRole("status")).toContainText("Đang tra cứu"); await expect(page.getByRole("button", { name: "Tra cứu", exact: true })).toBeDisabled(); await page.screenshot({ path: resolve(output, "state-loading-reception.png") }); release();
  await expect(page.getByText("Không tìm thấy khách hàng. Có thể tạo hồ sơ mới bên dưới.")).toBeVisible(); await page.screenshot({ path: resolve(output, "state-empty-reception.png") });
  await control("pause"); await page.getByRole("button", { name: "Tra cứu", exact: true }).click(); await expect(page.getByRole("alert", { name: "Thông báo lỗi" })).toContainText("Máy chủ đang gặp sự cố"); await control("resume"); await page.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(page.getByLabel("Họ tên khách hàng mới")).toBeVisible();
  await page.getByLabel("Họ tên khách hàng mới").fill("Khách trạng thái"); await page.getByRole("button", { name: "Tạo khách hàng và chọn" }).click(); await expect(page.getByText("Khách hàng chưa có thiết bị.")).toBeVisible();
  await page.getByLabel("Sản phẩm", { exact: true }).selectOption("101"); await page.getByLabel("Serial / IMEI", { exact: true }).fill("UI-STATES");
  let release2!: () => void; const gate2 = new Promise<void>(r => { release2 = r; }); await page.route("**/api/issue-categories", async route => { await gate2; await route.continue(); }, { times: 1 });
  await page.getByRole("button", { name: "Ghi nhận thiết bị", exact: true }).click(); await expect(page.locator(".category-region").getByRole("status")).toContainText("Đang tải"); await page.screenshot({ path: resolve(output, "state-loading-intake.png") }); release2(); await expect(page.getByLabel("Nhóm sự cố")).toBeVisible();
  await page.getByRole("button", { name: "Bỏ chọn thiết bị", exact: true }).click(); await expect(page.getByRole("button", { name: "Chọn thiết bị UI-STATES" })).toBeVisible(); await control("pause"); await page.getByRole("button", { name: "Chọn thiết bị UI-STATES" }).click(); await expect(page.locator(".category-region").getByRole("alert", { name: "Thông báo lỗi" })).toBeVisible(); await expect(page.locator(".warranty-region").getByRole("alert", { name: "Thông báo lỗi" })).toBeVisible(); await control("resume"); await page.locator(".category-region").getByRole("button", { name: "Thử lại", exact: true }).click(); await page.locator(".warranty-region").getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(page.getByLabel("Nhóm sự cố")).toBeVisible();
  await page.getByRole("button", { name: "Đăng xuất" }).click(); await login(page, "ql_empty"); await expect(page.getByText("Không có phiếu chờ phê duyệt trong phạm vi của bạn.")).toBeVisible(); await page.screenshot({ path: resolve(output, "state-empty-approval.png") });
  let release3!: () => void; const gate3 = new Promise<void>(r => { release3 = r; }); await page.route("**/api/tickets?*", async route => { await gate3; await route.continue(); }, { times: 1 });
  await page.getByLabel("Kết quả phê duyệt").selectOption("DA_PHE_DUYET"); await expect(page.getByRole("status")).toContainText("Đang tải"); await page.screenshot({ path: resolve(output, "state-loading-approval.png") }); release3(); await expect(page.getByText("Không có phiếu phù hợp bộ lọc đã phê duyệt.")).toBeVisible();
  await control("pause"); await page.getByRole("button", { name: "Làm mới danh sách" }).click(); await expect(page.getByRole("alert", { name: "Thông báo lỗi" })).toBeVisible(); await page.screenshot({ path: resolve(output, "backend-offline.png"), fullPage: true }); await control("resume"); await page.getByRole("button", { name: "Thử lại", exact: true }).click(); await expect(page.getByText("Không có phiếu phù hợp bộ lọc đã phê duyệt.")).toBeVisible();
});
test("UI04 quyền/center,401 thực sau restart, token memory và viewport375px", async ({ page }) => {
  const other = createApiClient({ baseUrl: fixture.backendUrl + "/api" }); await other.login("nv_demo_b", fixture.password);
  const c = await other.createCustomer({ full_name: "Khách center2", phone: "0886660003" }), d = await other.createDevice(c.customer_id, { product_id: 101, serial_no: "UI-CENTER2", purchase_date: null });
  const outside = await other.createTicket({ customer_id: c.customer_id, device_id: d.device_id, center_id: 2, issue_desc: "Ngoài phạm vi", category_id: 3, priority: "CAO" });
  await login(page, "ql_demo_a"); await expect(page.getByRole("link", { name: "Tiếp nhận mới", exact: true })).toHaveCount(0); await expect(page.getByText(outside.ticket_code, { exact: true })).toHaveCount(0);
  await page.getByRole("button", { name: "Đăng xuất" }).click(); await login(page, "nv_demo_a"); await expect(page.getByRole("link", { name: "Phiếu chưa xác minh", exact: true })).toHaveCount(0);
  await page.setViewportSize({ width: 375, height: 812 }); await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
  await control("restart"); await page.getByLabel("Số điện thoại tra cứu").fill("0990000001"); await page.getByRole("button", { name: "Tra cứu", exact: true }).click(); await expect(page.getByRole("heading", { name: "Mekong Mobile — Đăng nhập" })).toBeVisible(); await expect(page.getByText(/Phiên làm việc đã hết hạn/)).toBeVisible();
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});

test("FE01-UI01 route client giữ phiên; reload cần login và guard không gọi API sai quyền", async ({ page }) => {
  const paths: string[] = [];
  page.on("request", request => { const path = new URL(request.url()).pathname; if (path.startsWith("/api/")) paths.push(path); });
  await page.goto("/intake");
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Số điện thoại tra cứu")).toHaveCount(0);
  expect(paths).toEqual([]);
  await page.getByLabel("Tên đăng nhập").fill("nv_demo_a");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/intake$/);
  await page.screenshot({ path: resolve(output, "fe01-shell-desktop.png"), fullPage: true });
  for (const width of [768, 375]) {
    await page.setViewportSize({ width, height: 900 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth)).toBe(true);
    await page.screenshot({ path: resolve(output, "fe01-shell-" + width + ".png"), fullPage: true });
  }
  await page.setViewportSize({ width: 1280, height: 900 });
  await page.evaluate(() => { Object.assign(window, { fe01DocumentMarker: "kept" }); });
  await page.getByRole("link", { name: "Mở phiếu bằng ID", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByLabel("ID phiếu", { exact: true })).toBeVisible();
  expect(paths).not.toContain("/api/tickets");
  await page.getByRole("link", { name: "Tiếp nhận mới", exact: true }).click();
  await expect(page.getByLabel("Số điện thoại tra cứu")).toBeVisible();
  expect(await page.evaluate(() => Reflect.get(window, "fe01DocumentMarker"))).toBe("kept");
  await expect(page.getByRole("main")).toHaveCount(1);
  await page.reload();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByLabel("Số điện thoại tra cứu")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);

  paths.length = 0;
  await page.getByLabel("Tên đăng nhập").fill("ql_demo_a");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(/\/tickets$/);
  await expect(page.getByLabel("Kết quả phê duyệt")).toBeVisible();
  expect(paths).not.toContain("/api/products");
  expect(paths).not.toContain("/api/issue-categories");
  await expect(page.getByRole("link", { name: "Tiếp nhận mới", exact: true })).toHaveCount(0);
});

test("FE01-UI02 mở URL chi tiết chưa login, quay lại đúng phiếu; logout dọn dữ liệu", async ({ page }) => {
  const api = createApiClient({ baseUrl: fixture.backendUrl + "/api" });
  await api.login("nv_demo_a", fixture.password);
  const customer = await api.createCustomer({ full_name: "Khách kiểm tra route", phone: "0886660004" });
  const device = await api.createDevice(customer.customer_id, { product_id: 101, serial_no: "FE01-ROUTE", purchase_date: null });
  const ticket = await api.createTicket({ customer_id: customer.customer_id, device_id: device.device_id, center_id: 1, issue_desc: "Kiểm tra điều hướng chi tiết", category_id: 3, priority: "CAO" });
  await page.goto("/tickets/" + ticket.ticket_id);
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.getByText(customer.full_name, { exact: true })).toHaveCount(0);
  await page.getByLabel("Tên đăng nhập").fill("nv_demo_a");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page).toHaveURL(new RegExp("/tickets/" + ticket.ticket_id + "$"));
  await expect(page.getByTestId("ticket-status")).toHaveText("MOI");
  await expect(page.getByText("Kiểm tra điều hướng chi tiết", { exact: true })).toBeVisible();
  // Tạo lịch sử điều hướng client thật trước khi kiểm nút Back sau logout.
  await page.getByRole("link", { name: "← Tiếp nhận mới", exact: true }).click();
  await page.getByRole("link", { name: "Mở phiếu bằng ID", exact: true }).click();
  await page.getByLabel("ID phiếu", { exact: true }).fill(String(ticket.ticket_id));
  await page.getByRole("button", { name: "Mở phiếu", exact: true }).click();
  await expect(page.getByTestId("ticket-status")).toHaveText("MOI");
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page).toHaveURL(/\/login$/);
  await expect(page.locator(".detail")).toHaveCount(0);
  await page.goBack();
  await expect(page.getByRole("heading", { name: "Mekong Mobile — Đăng nhập" })).toBeVisible();
  await expect(page.locator(".detail")).toHaveCount(0);
  expect(await page.evaluate(() => localStorage.length + sessionStorage.length)).toBe(0);
});
