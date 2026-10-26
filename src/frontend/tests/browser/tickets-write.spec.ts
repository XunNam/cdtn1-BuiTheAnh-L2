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
  const prior = JSON.parse(await readFile(fixture.statusFile, "utf8")), nonce = prior.nonce + 1;
  await writeFile(fixture.controlFile, JSON.stringify({ nonce, action, ...extra }));
  await expect.poll(async () => { try { const value = JSON.parse(await readFile(fixture.statusFile, "utf8")); return value.nonce === nonce && value.ok; } catch { return false; } }).toBe(true);
}
async function client(user = "nv_demo_a") {
  const api = createApiClient({ baseUrl: fixture.backendUrl + "/api" });
  const session = await api.login(user, fixture.password);
  return { api, session };
}
async function makeTicket(suffix: number, user = "nv_demo_a") {
  const { api, session } = await client(user);
  const customer = await api.createCustomer({ full_name: "Khách FE06 " + suffix, phone: "088677" + String(suffix).padStart(4, "0") });
  const device = await api.createDevice(customer.customer_id, { product_id: 101, serial_no: "FE06-" + suffix, purchase_date: null });
  const ticket = await api.createTicket({ customer_id: customer.customer_id, device_id: device.device_id, center_id: session.principal.active_center_id, issue_desc: "Yêu cầu FE06 " + suffix, category_id: 3, priority: "CAO" });
  return { api, session, customer, device, ticket };
}
async function login(page: Page, user = "nv_demo_a") {
  await page.goto("/login"); await page.getByLabel("Tên đăng nhập", { exact: true }).fill(user);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password); await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
}
async function openNv(page: Page, id: number) {
  await page.getByRole("link", { name: "Mở phiếu bằng ID", exact: true }).click();
  await page.getByLabel("ID phiếu", { exact: true }).fill(String(id)); await page.getByRole("button", { name: "Mở phiếu", exact: true }).click();
  await expect(page.getByTestId("ticket-code")).toBeVisible();
}
async function openManager(page: Page, code: string) {
  const open = page.getByRole("link", { name: "Xem phiếu " + code, exact: true });
  await expect(page.getByRole("button", { name: "Làm mới danh sách", exact: true })).toBeVisible();
  for (let index = 1; !(await open.count()) && index < 50; index++) {
    await expect(page.getByRole("button", { name: "Trang sau", exact: true })).toBeEnabled();
    await page.getByRole("button", { name: "Trang sau", exact: true }).click();
    await expect(page.locator('[aria-label="Phân trang phiếu"]')).toContainText("Trang " + (index + 1) + " ·");
  }
  await open.click(); await expect(page.getByTestId("ticket-code")).toHaveText(code);
}
const save = (page: Page) => page.getByRole("button", { name: "Lưu trao đổi", exact: true });
const approve = (page: Page) => page.getByRole("button", { name: "Phê duyệt cho phép xử lý", exact: true });
const snapshot = (ticket: dto.Ticket) => ({ status: ticket.status, warranty_status: ticket.warranty_status, received_at: ticket.received_at, due_date: ticket.due_date,
  assessed_on: ticket.assessed_on, purchase_date_snapshot: ticket.purchase_date_snapshot, warranty_months_snapshot: ticket.warranty_months_snapshot, warranty_expires_on: ticket.warranty_expires_on });
test.beforeEach(async () => { await control("restart"); });
test.afterEach(async () => { await control("restart"); });

test("FE06-UI01 trao đổi Unicode2000/busy/payload,1 POST và tới trang chứa bản ghi21", async ({ page }) => {
  const prepared = await makeTicket(1);
  for (let index = 1; index <= 20; index++) await prepared.api.communicate(prepared.ticket.ticket_id, "Trao đổi trước " + index);
  await login(page); await openNv(page, prepared.ticket.ticket_id);
  await expect(page.getByRole("button", { name: "Phê duyệt cho phép xử lý", exact: true })).toHaveCount(0);
  let posts = 0; let payload: unknown;
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/communications")) { posts++; payload = request.postDataJSON(); } });
  await save(page).click(); await expect(page.getByLabel("Nội dung trao đổi")).toBeFocused(); expect(posts).toBe(0);
  await page.getByLabel("Nội dung trao đổi").fill(" \t\n "); await save(page).click(); expect(posts).toBe(0);
  await page.getByLabel("Nội dung trao đổi").fill("😀".repeat(2001)); await save(page).click();
  await expect(page.getByText("Nội dung trao đổi tối đa 2000 ký tự.", { exact: true })).toBeVisible(); expect(posts).toBe(0);
  const content = "😀".repeat(2000); await page.getByLabel("Nội dung trao đổi").fill(" " + content + " ");
  const gate = Promise.withResolvers<void>();
  await page.route("**/api/tickets/*/communications", async route => { await gate.promise; await route.continue(); }, { times: 1 });
  const response = page.waitForResponse(value => value.request().method() === "POST" && new URL(value.url()).pathname.endsWith("/communications"));
  await save(page).evaluate(button => { if (button instanceof HTMLButtonElement) { button.click(); button.click(); } });
  await expect(page.getByRole("button", { name: "Đang lưu…", exact: true })).toBeDisabled(); await expect(page.getByLabel("Nội dung trao đổi")).toBeDisabled(); gate.resolve();
  const saved = dto.communication(dto.record(await (await response).json()).data);
  await expect(page.getByTestId("communication-saved")).toContainText("#" + saved.communication_id);
  await expect(page.locator('[aria-label="Phân trang trao đổi"]')).toContainText("Trang 3 · 21 trao đổi");
  await expect(page.locator('[data-communication-id="' + saved.communication_id + '"]')).toBeVisible();
  expect(payload).toEqual({ content }); expect(posts).toBe(1); expect(saved.created_by).toBe(prepared.session.principal.employee_id);
  await expect(page.getByTestId("communication-saved").locator("time")).toHaveAttribute("datetime", saved.created_at);
  await expect(save(page)).toHaveCount(0); expect((await prepared.api.detail(prepared.ticket.ticket_id)).can_proceed).toBe(false);
});

test("FE06-UI02 lỗi400 thật giữ nội dung/focus rồi gửi lại chủ động", async ({ page }) => {
  const prepared = await makeTicket(2); await login(page); await openNv(page, prepared.ticket.ticket_id);
  await page.getByLabel("Nội dung trao đổi").fill("Bản nhập được giữ khi400");
  await page.route("**/api/tickets/*/communications", route => route.continue({ postData: "{}" }), { times: 1 });
  await save(page).click(); await expect(page.getByLabel("Nội dung trao đổi")).toHaveAttribute("aria-invalid", "true");
  await expect(page.getByLabel("Nội dung trao đổi")).toHaveValue("Bản nhập được giữ khi400"); await expect(page.getByLabel("Nội dung trao đổi")).toBeFocused();
  await save(page).click(); await expect(page.getByTestId("communication-saved")).toBeVisible();
});

test("FE06-UI03 đã lưu nhưng GET lịch sử lỗi: không gửi lại, retry GET rồi bản nhập mới rỗng", async ({ page }) => {
  const prepared = await makeTicket(3); await login(page); await openNv(page, prepared.ticket.ticket_id);
  await expect(page.getByText("Phiếu chưa có trao đổi.", { exact: true })).toBeVisible();
  let posts = 0; page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/communications")) posts++; });
  await page.route("**/api/tickets/*/communications?*", route => route.abort("failed"), { times: 1 });
  await page.getByLabel("Nội dung trao đổi").fill("Đã ghi dù tải lại lỗi"); await save(page).click();
  await expect(page.getByTestId("communication-saved")).toBeVisible();
  await expect(page.getByText("Đã lưu trao đổi, chưa tải lại được lịch sử. Không cần lưu lại nội dung này.", { exact: true })).toBeVisible();
  await expect(save(page)).toHaveCount(0); expect(posts).toBe(1);
  await page.screenshot({ path: resolve(output, "communication-saved-reload-error.png"), fullPage: true });
  await page.getByRole("button", { name: "Tải lại lịch sử đã lưu", exact: true }).click();
  await expect(page.locator(".communication-history").getByText("Đã ghi dù tải lại lỗi", { exact: true })).toBeVisible(); expect(posts).toBe(1);
  await page.getByRole("button", { name: "Ghi trao đổi tiếp", exact: true }).click(); await expect(page.getByLabel("Nội dung trao đổi")).toHaveValue("");
});

test("FE06-UI04 E13 timeout sau commit: GET đối chiếu không tự suy từ content hoặc POST lặp", async ({ page }) => {
  const prepared = await makeTicket(4); await login(page); await openNv(page, prepared.ticket.ticket_id);
  const gate = Promise.withResolvers<void>(); let saved: dto.Communication | undefined; let posts = 0;
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/communications")) posts++; });
  await page.route("**/api/tickets/*/communications", async route => { const response = await route.fetch(); saved = dto.communication(dto.record(await response.json()).data); await gate.promise; await route.fulfill({ response }).catch(() => {}); }, { times: 1 });
  await page.getByLabel("Nội dung trao đổi").fill("Trao đổi có thể đã lưu"); await save(page).click();
  await expect(page.getByTestId("communication-uncertain")).toBeVisible({ timeout: 16000 }); gate.resolve();
  await expect(save(page)).toBeDisabled(); await expect(page.getByLabel("Nội dung trao đổi")).toHaveValue("Trao đổi có thể đã lưu");
  await page.getByRole("button", { name: "Kiểm tra lịch sử", exact: true }).click();
  if (!saved) throw new Error("Không nhận được kết quả fixture commit");
  await expect(page.locator('[data-communication-id="' + saved.communication_id + '"]')).toBeVisible();
  await expect(page.getByTestId("communication-uncertain")).toBeVisible(); await expect(page.getByTestId("communication-saved")).toHaveCount(0); expect(posts).toBe(1);
  await page.screenshot({ path: resolve(output, "communication-uncertain.png"), fullPage: true });
  page.once("dialog", dialog => dialog.accept()); await page.getByRole("button", { name: "Bắt đầu trao đổi mới", exact: true }).click();
  await expect(page.getByLabel("Nội dung trao đổi")).toHaveValue(""); expect(posts).toBe(1);
});

test("FE06-UI05 note1000/1001, busy1 POST, metadata thật và snapshot/SLA giữ sau duyệt", async ({ page }) => {
  const prepared = await makeTicket(5), manager = await client("ql_demo_a");
  await login(page, "ql_demo_a"); await openManager(page, prepared.ticket.ticket_code);
  await expect(page.getByLabel("Nội dung trao đổi")).toHaveCount(0);
  let posts = 0; let payload: unknown; page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/warranty-approval")) { posts++; payload = request.postDataJSON(); } });
  await page.getByLabel("Ghi chú phê duyệt (không bắt buộc)").fill("😀".repeat(1001)); await approve(page).click();
  await expect(page.getByText("Ghi chú phê duyệt tối đa 1000 ký tự.", { exact: true })).toBeVisible(); expect(posts).toBe(0);
  const note = "😀".repeat(1000); await page.getByLabel("Ghi chú phê duyệt (không bắt buộc)").fill(" " + note + " ");
  const gate = Promise.withResolvers<void>(); await page.route("**/api/tickets/*/warranty-approval", async route => { await gate.promise; await route.continue(); }, { times: 1 });
  await approve(page).evaluate(button => { if (button instanceof HTMLButtonElement) { button.click(); button.click(); } });
  await expect(page.getByRole("button", { name: "Đang phê duyệt…", exact: true })).toBeDisabled(); gate.resolve();
  await expect(page.getByTestId("approval-saved")).toBeVisible(); await expect(page.getByTestId("approval-status")).toHaveText("Đã phê duyệt");
  const actual = await manager.api.detail(prepared.ticket.ticket_id);
  expect(snapshot(actual)).toEqual(snapshot(prepared.ticket)); expect(actual.can_proceed).toBe(true); expect(actual.approved_by).toBe(manager.session.principal.employee_id);
  expect(actual.approval_note).toBe(note); expect(payload).toEqual({ note }); expect(posts).toBe(1);
  await expect(page.locator(".approval-information time")).toHaveAttribute("datetime", actual.approved_at!);
  await page.getByRole("link", { name: "← Danh sách", exact: true }).click();
  await expect(page.getByRole("link", { name: "Xem phiếu " + prepared.ticket.ticket_code, exact: true })).toHaveCount(0);
});

test("FE06-UI06 hai QL409 ALREADY_APPROVED: giữ người/giờ/note đầu, không ghi đè", async ({ page }) => {
  const prepared = await makeTicket(6), first = await client("ql_demo_a");
  await login(page, "ql_demo_ab"); await openManager(page, prepared.ticket.ticket_code);
  await page.getByLabel("Ghi chú phê duyệt (không bắt buộc)").fill("Ghi chú của người đến sau");
  const original = await first.api.approve(prepared.ticket.ticket_id, "Người duyệt đầu"); await approve(page).click();
  await expect(page.locator(".approval-form").getByRole("alert")).toBeVisible(); await expect(page.getByTestId("approval-status")).toHaveText("Đã phê duyệt");
  const actual = await first.api.detail(prepared.ticket.ticket_id);
  expect(actual.approved_by).toBe(original.approved_by); expect(actual.approved_at).toBe(original.approved_at); expect(actual.approval_note).toBe("Người duyệt đầu");
  expect(snapshot(actual)).toEqual(snapshot(prepared.ticket)); await expect(approve(page)).toHaveCount(0);
  await expect(page.locator(".approval-information")).toContainText("Người duyệt đầu");
  await page.screenshot({ path: resolve(output, "approval-conflict.png"), fullPage: true });
});

test("FE06-UI07 APPROVAL_NOT_APPLICABLE thật: đọc trạng thái mới và bỏ action", async ({ page }) => {
  const prepared = await makeTicket(7); await login(page, "ql_demo_a"); await openManager(page, prepared.ticket.ticket_code);
  await control("advance-test-ticket", { ticketId: prepared.ticket.ticket_id }); await approve(page).click();
  await expect(page.locator(".approval-form").getByRole("alert")).toBeVisible();
  await expect(page.getByTestId("ticket-status")).toHaveAttribute("data-value", "DA_PHAN_CONG"); await expect(approve(page)).toHaveCount(0);
  expect((await prepared.api.detail(prepared.ticket.ticket_id)).approval_status).toBe("CHO_PHE_DUYET");
});

test("FE06-UI08 E11 timeout sau commit: chỉ GET phục hồi metadata, không POST lại", async ({ page }) => {
  const prepared = await makeTicket(8); await login(page, "ql_demo_a"); await openManager(page, prepared.ticket.ticket_code);
  let posts = 0; const gate = Promise.withResolvers<void>();
  page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/warranty-approval")) posts++; });
  await page.route("**/api/tickets/*/warranty-approval", async route => { const response = await route.fetch(); await gate.promise; await route.fulfill({ response }).catch(() => {}); }, { times: 1 });
  await page.getByLabel("Ghi chú phê duyệt (không bắt buộc)").fill(" \t "); await approve(page).click();
  await expect(page.getByTestId("approval-uncertain")).toBeVisible({ timeout: 16000 }); gate.resolve(); await expect(approve(page)).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra kết quả phê duyệt", exact: true }).click();
  await expect(page.getByTestId("approval-status")).toHaveText("Đã phê duyệt"); await expect(approve(page)).toHaveCount(0); expect(posts).toBe(1);
  const actual = await prepared.api.detail(prepared.ticket.ticket_id); expect(actual.approval_note).toBe(null); expect(snapshot(actual)).toEqual(snapshot(prepared.ticket));
  await page.screenshot({ path: resolve(output, "approval-recovered.png"), fullPage: true });
});

test("FE06-UI09 đã duyệt nhưng GET chi tiết lỗi: giữ xác nhận, chỉ retry GET", async ({ page }) => {
  const prepared = await makeTicket(9); await login(page, "ql_demo_a"); await openManager(page, prepared.ticket.ticket_code);
  let posts = 0; page.on("request", request => { if (request.method() === "POST" && new URL(request.url()).pathname.endsWith("/warranty-approval")) posts++; });
  await page.route(fixture => fixture.pathname === "/api/tickets/" + prepared.ticket.ticket_id, route => route.abort("failed"), { times: 1 });
  await approve(page).click(); await expect(page.getByTestId("approval-saved")).toBeVisible();
  await expect(page.getByText("Đã phê duyệt, chưa tải lại được chi tiết phiếu.", { exact: true })).toBeVisible();
  await expect(page.getByTestId("approval-status")).toHaveText("Đã phê duyệt"); await expect(approve(page)).toHaveCount(0);
  await page.getByRole("button", { name: "Tải lại trạng thái phê duyệt", exact: true }).click();
  await expect(page.getByText("Đã phê duyệt, chưa tải lại được chi tiết phiếu.", { exact: true })).toHaveCount(0); expect(posts).toBe(1);
});

test("FE06-UI10 NFR02: no token/NV/ngoài center không duyệt, QL không ghi E13 và dữ liệu nguyên", async () => {
  const prepared = await makeTicket(10), manager = await client("ql_demo_a"), outside = await makeTicket(11, "nv_demo_b");
  const before = await prepared.api.detail(prepared.ticket.ticket_id), messages = await prepared.api.communications(prepared.ticket.ticket_id);
  const endpoint = fixture.backendUrl + "/api/tickets/" + prepared.ticket.ticket_id;
  const anonymous = await fetch(endpoint + "/warranty-approval", { method: "POST", headers: { "Content-Type": "application/json" }, body: "{}" }); expect(anonymous.status).toBe(401);
  const forbidden = await fetch(endpoint + "/warranty-approval", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + prepared.session.access_token }, body: "{}" }); expect(forbidden.status).toBe(403);
  const out = await fetch(fixture.backendUrl + "/api/tickets/" + outside.ticket.ticket_id + "/warranty-approval", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + manager.session.access_token }, body: "{}" }); expect(out.status).toBe(404);
  const communication = await fetch(endpoint + "/communications", { method: "POST", headers: { "Content-Type": "application/json", Authorization: "Bearer " + manager.session.access_token }, body: JSON.stringify({ content: "QL không được ghi" }) }); expect(communication.status).toBe(403);
  expect(await prepared.api.detail(prepared.ticket.ticket_id)).toEqual(before); expect(await prepared.api.communications(prepared.ticket.ticket_id)).toEqual(messages);
  expect((await outside.api.detail(outside.ticket.ticket_id)).approval_status).toBe("CHO_PHE_DUYET");
});

test("FE06-UI11 E13 về muộn sau đổi ID không xác nhận/ghi vào phiếu mới", async ({ page }) => {
  const first = await makeTicket(12), second = await makeTicket(13); await login(page); await openNv(page, first.ticket.ticket_id);
  const committed = Promise.withResolvers<void>(), gate = Promise.withResolvers<void>();
  await page.route("**/api/tickets/*/communications", async route => { const response = await route.fetch(); committed.resolve(); await gate.promise; await route.fulfill({ response }); }, { times: 1 });
  await page.getByLabel("Nội dung trao đổi").fill("Chỉ được lưu vào phiếu trước"); await save(page).click(); await committed.promise;
  await openNv(page, second.ticket.ticket_id); gate.resolve();
  await expect(page.getByLabel("Nội dung trao đổi")).toHaveValue(""); await expect(page.getByTestId("communication-saved")).toHaveCount(0);
  expect((await first.api.communications(first.ticket.ticket_id)).meta.total).toBe(1); expect((await second.api.communications(second.ticket.ticket_id)).meta.total).toBe(0);
});

test("FE06-UI12 E13 bị403 giữ draft;401 thật sau restart về login và dọn dữ liệu", async ({ page }) => {
  const prepared = await makeTicket(14), manager = await client("ql_demo_a"); await login(page); await openNv(page, prepared.ticket.ticket_id);
  await page.route("**/api/tickets/*/communications", route => route.continue({ headers: { ...route.request().headers(), authorization: "Bearer " + manager.session.access_token } }), { times: 1 });
  await page.getByLabel("Nội dung trao đổi").fill("Nội dung không được mất khi403"); await save(page).click();
  await expect(page.locator(".communication-form").getByRole("alert")).toBeVisible(); await expect(page.getByLabel("Nội dung trao đổi")).toHaveValue("Nội dung không được mất khi403");
  await expect(page.getByRole("button", { name: "Đăng xuất", exact: true })).toBeVisible();
  await control("restart"); await save(page).click(); await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toBeVisible();
  await expect(page.getByText("Nội dung không được mất khi403", { exact: true })).toHaveCount(0); await expect(page.getByTestId("communication-saved")).toHaveCount(0);
});
