import { test, expect } from "@playwright/test";
import type { Page } from "@playwright/test";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { resolve } from "node:path";
import { createApiClient } from "../../src/lib/api-client";

const fixture: { password: string; backendUrl: string; controlFile: string; statusFile: string; productCount: number } = JSON.parse(await readFile(process.env.L2_UI_FIXTURE!, "utf8"));
const output = resolve(process.env.L2_UI_OUTPUT_DIR ?? "../../docs/tests/frontend/phase-07");
await mkdir(output, { recursive: true });
async function control(action: "restart" | "empty-products") {
  const prior = JSON.parse(await readFile(fixture.statusFile, "utf8"));
  const nonce = prior.nonce + 1;
  await writeFile(fixture.controlFile, JSON.stringify({ nonce, action }));
  await expect.poll(async () => { try { const value = JSON.parse(await readFile(fixture.statusFile, "utf8")); return value.nonce === nonce && value.ok; } catch { return false; } }).toBe(true);
}
async function login(page: Page) {
  await page.goto("/login");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill("nv_demo_a");
  await page.getByLabel("Mật khẩu", { exact: true }).fill(fixture.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  await expect(page.getByLabel("Số điện thoại tra cứu")).toBeVisible();
}
async function client(user = "nv_demo_a") {
  const api = createApiClient({ baseUrl: fixture.backendUrl + "/api" });
  await api.login(user, fixture.password);
  return api;
}
async function lookup(page: Page, phone: string) {
  await page.getByLabel("Số điện thoại tra cứu").fill(phone);
  await page.getByRole("button", { name: "Tra cứu", exact: true }).click();
  await expect(page.getByTestId("lookup-result")).toHaveAttribute("data-result", /^(found|empty)$/);
}
async function newDevice(page: Page, serial: string, purchase = "") {
  await page.getByLabel("Sản phẩm", { exact: true }).selectOption("101");
  await page.getByLabel("Serial / IMEI", { exact: true }).fill(serial);
  await page.getByLabel("Ngày mua (có thể bỏ trống)", { exact: true }).fill(purchase);
  await page.getByRole("button", { name: "Ghi nhận thiết bị", exact: true }).click();
}
test.beforeEach(async ({ page }) => { await control("restart"); await login(page); });
test.afterEach(async () => { await control("restart"); });

test("FE03-UI01 tra cứu/tạo khách cùng màn hình, phone raw tách khỏi masked, lỗi giữ dữ liệu", async ({ page }) => {
  await lookup(page, "+84 886.330.001");
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  await expect(page.getByLabel("Họ tên khách hàng mới")).toBeFocused();
  await expect(page.getByText("Vui lòng nhập họ tên.", { exact: true })).toBeVisible();
  await page.getByLabel("Họ tên khách hàng mới").fill("Khách mới FE03");
  await page.getByLabel("Địa chỉ (không bắt buộc)").fill("Địa chỉ kiểm thử FE03");
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  await expect(page.getByTestId("lookup-result")).toContainText("Khách mới FE03");
  await expect(page.getByTestId("lookup-result")).toContainText("088****001");
  await expect(page.getByTestId("lookup-result")).toContainText("Địa chỉ kiểm thử FE03");
  await expect(page.getByLabel("Số điện thoại tra cứu")).toHaveValue("+84 886.330.001");
  await expect(page.getByText("Khách hàng chưa có thiết bị.", { exact: true })).toBeVisible();
  await expect(page.getByLabel("Sản phẩm", { exact: true })).toBeVisible();
  expect(new URL(page.url()).search).toBe("");
});

test("FE03-UI02 phone409 cùng scope chọn hồ sơ cũ; ngoài scope không lộ profile", async ({ page }) => {
  const api = await client();
  await lookup(page, "0886330002");
  await page.getByLabel("Họ tên khách hàng mới").fill("Tên sẽ không được tạo trùng");
  await api.createCustomer({ full_name: "Hồ sơ đồng thời FE03", phone: "0886330002" });
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  await expect(page.getByTestId("lookup-result")).toContainText("Hồ sơ đồng thời FE03");
  await expect(page.getByText("Số điện thoại đã có hồ sơ. Đã chọn hồ sơ hiện có.", { exact: true })).toBeVisible();
  const other = await client("nv_demo_b");
  await other.createCustomer({ full_name: "TEN_NGOAI_PHAM_VI_FE03", phone: "0886330003" });
  await lookup(page, "0886330003");
  await page.getByLabel("Họ tên khách hàng mới").fill("Không được tạo ngoài scope");
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  await expect(page.getByRole("alert", { name: "Thông báo lỗi" })).toBeVisible();
  await expect(page.getByText("TEN_NGOAI_PHAM_VI_FE03", { exact: true })).toHaveCount(0);
  await expect(page.getByText("Chọn khách hàng để xem thiết bị.", { exact: true })).toBeVisible();
});

test("FE03-UI03 date400, serial409 cùng chủ/khác chủ và query exact giữ số0/case", async ({ page }) => {
  const api = await client();
  const first = await api.createCustomer({ full_name: "Chủ thiết bị FE03", phone: "0886330004" });
  const other = await api.createCustomer({ full_name: "CHU_KHAC_FE03", phone: "0886330005" });
  await api.createDevice(first.customer_id, { product_id: 101, serial_no: "00Case-Exist", purchase_date: null });
  await api.createDevice(other.customer_id, { product_id: 101, serial_no: "00Other-Owner", purchase_date: null });
  await lookup(page, "0886330004");
  await newDevice(page, "00Future", "2999-01-01");
  await expect(page.locator("#device-purchase-error")).toContainText("tương lai");
  await expect(page.getByLabel("Serial / IMEI", { exact: true })).toHaveValue("00Future");
  await newDevice(page, "00Case-Exist");
  await expect(page.getByTestId("selected-device")).toContainText("00Case-Exist");
  await expect(page.getByText("Serial/IMEI đã tồn tại. Đã chọn thiết bị hiện có.", { exact: true })).toBeVisible();
  await newDevice(page, "00Other-Owner");
  await expect(page.getByRole("alert", { name: "Thông báo lỗi" })).toContainText("Thiết bị không thuộc");
  await expect(page.getByTestId("selected-device")).toHaveCount(0);
  await expect(page.getByLabel("Nhóm sự cố")).toHaveCount(0);
  await expect(page.getByText("CHU_KHAC_FE03", { exact: true })).toHaveCount(0);
  await page.getByLabel("Tra cứu Serial / IMEI", { exact: true }).fill("00case-exist");
  await page.getByRole("button", { name: "Kiểm tra thiết bị", exact: true }).click();
  await expect(page.getByText("Không tìm thấy thiết bị theo Serial/IMEI này.", { exact: true })).toBeVisible();
  await page.getByLabel("Tra cứu Serial / IMEI", { exact: true }).fill(" 00Case-Exist ");
  await page.getByRole("button", { name: "Kiểm tra thiết bị", exact: true }).click();
  await page.getByRole("button", { name: "Chọn thiết bị 00Case-Exist", exact: true }).click();
  await expect(page.getByTestId("selected-device")).toContainText("Bảo hành: 12 tháng");
});

test("FE03-UI04 đọc đủ105 thiết bị và chọn sản phẩm sau bản ghi100, months do server cấp", async ({ page }) => {
  const api = await client();
  const customer = await api.createCustomer({ full_name: "Khách phân trang FE03", phone: "0886330006" });
  for (let index = 1; index <= 105; index++) await api.createDevice(customer.customer_id, { product_id: 101, serial_no: "00Page-" + String(index).padStart(3, "0"), purchase_date: null });
  await lookup(page, "0886330006");
  const devicePages = page.locator('[aria-label="Phân trang thiết bị"]');
  const names = new Set<string>();
  for (let index = 1; index <= 11; index++) {
    await expect(devicePages).toContainText("Trang " + index + " · 105 thiết bị");
    for (const name of await page.locator(".choices button").allTextContents()) names.add(name);
    if (index < 11) await page.getByRole("button", { name: "Thiết bị sau", exact: true }).click();
  }
  expect(names.size).toBe(105);
  expect(names.has("Chọn thiết bị 00Page-105")).toBe(true);
  expect(fixture.productCount).toBeGreaterThan(100);
  const productPages = page.locator('[aria-label="Phân trang sản phẩm"]');
  for (let index = 1; index <= 5; index++) {
    await page.getByRole("button", { name: "Sản phẩm sau", exact: true }).click();
    await expect(productPages).toContainText("Trang " + (index + 1) + " ·");
  }
  await page.getByLabel("Sản phẩm", { exact: true }).selectOption("1101");
  for (let index = 5; index >= 1; index--) {
    await page.getByRole("button", { name: "Sản phẩm trước", exact: true }).click();
    await expect(productPages).toContainText("Trang " + index + " ·");
  }
  await expect(page.getByLabel("Sản phẩm", { exact: true })).toHaveValue("1101");
  await page.getByLabel("Serial / IMEI", { exact: true }).fill("00ProductLast");
  await page.getByRole("button", { name: "Ghi nhận thiết bị", exact: true }).click();
  await expect(page.getByTestId("selected-device")).toContainText("Bảo hành: 10 tháng");
  const stored = await api.devices(customer.customer_id, { serial_no: "00ProductLast" });
  expect(stored.data[0].product_id).toBe(1101);
  expect(stored.data[0].warranty_months).toBe(10);
  await page.screenshot({ path: resolve(output, "intake-pagination.png"), fullPage: true });
});

test("FE03-UI05 sửa phone trong lúc tải; response cũ không đổi khách/thiết bị/preview mới", async ({ page }) => {
  const api = await client();
  const first = await api.createCustomer({ full_name: "Khách A đợi phản hồi", phone: "0886330007" });
  const second = await api.createCustomer({ full_name: "Khách B được chọn", phone: "0886330008" });
  await api.createDevice(first.customer_id, { product_id: 101, serial_no: "00Old", purchase_date: null });
  await api.createDevice(second.customer_id, { product_id: 101, serial_no: "00New", purchase_date: null });
  await lookup(page, "0886330007");
  await page.getByRole("button", { name: "Chọn thiết bị 00Old", exact: true }).click();
  await expect(page.getByLabel("Nhóm sự cố")).toBeVisible();
  const gate = Promise.withResolvers<void>();
  await page.route("**/api/customers?*", async route => { await gate.promise; await route.continue(); }, { times: 1 });
  await page.getByRole("button", { name: "Tra cứu", exact: true }).click();
  await expect(page.getByLabel("Số điện thoại tra cứu")).toBeEnabled();
  await lookup(page, "0886330008");
  await expect(page.getByTestId("lookup-result")).toContainText("Khách B được chọn");
  await expect(page.getByTestId("selected-device")).toHaveCount(0);
  await expect(page.getByLabel("Nhóm sự cố")).toHaveCount(0);
  const oldResponse = page.waitForResponse(response => new URL(response.url()).searchParams.get("phone") === "0886330007");
  gate.resolve(); await oldResponse;
  await expect(page.getByTestId("lookup-result")).toContainText("Khách B được chọn");
  await page.getByRole("button", { name: "Chọn thiết bị 00New", exact: true }).click();
  await expect(page.locator(".intake-classification")).toContainText("Serial/IMEI: 00New");
  await expect(page.locator(".intake-classification")).not.toContainText("00Old");
});

test("FE03-UI06 catalog lỗi/rỗng độc lập với thiết bị có sẵn", async ({ page }) => {
  const api = await client();
  const customer = await api.createCustomer({ full_name: "Khách catalog FE03", phone: "0886330009" });
  await api.createDevice(customer.customer_id, { product_id: 101, serial_no: "00CatalogSafe", purchase_date: null });
  await page.route("**/api/products?*", route => route.abort("failed"), { times: 1 });
  await lookup(page, "0886330009");
  await expect(page.locator(".product-picker").getByRole("alert")).toBeVisible();
  await page.getByRole("button", { name: "Chọn thiết bị 00CatalogSafe", exact: true }).click();
  await expect(page.getByLabel("Nhóm sự cố")).toBeVisible();
  await page.locator(".product-picker").getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByLabel("Sản phẩm", { exact: true })).toBeVisible();
  await control("empty-products"); await login(page);
  await lookup(page, "0886330009");
  await expect(page.getByText("Chưa có sản phẩm đang sử dụng để ghi nhận thiết bị.", { exact: true })).toBeVisible();
  await expect(page.getByRole("button", { name: "Ghi nhận thiết bị", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Chọn thiết bị 00CatalogSafe", exact: true }).click();
  await expect(page.getByLabel("Nhóm sự cố")).toBeVisible();
  await page.screenshot({ path: resolve(output, "intake-empty-catalog.png"), fullPage: true });
});

test("FE03-UI07 mất response sau commit: phục hồi GET customer/device, không tự POST lặp", async ({ page }) => {
  let customerPosts = 0;
  let devicePosts = 0;
  page.on("request", request => {
    if (request.method() !== "POST") return;
    const path = new URL(request.url()).pathname;
    if (path === "/api/customers") customerPosts++;
    if (/\/api\/customers\/\d+\/devices$/.test(path)) devicePosts++;
  });
  await lookup(page, "0886330010");
  await page.getByLabel("Họ tên khách hàng mới").fill("Khách mất phản hồi FE03");
  await page.route("**/api/customers", async route => { await route.fetch(); await route.abort("failed"); }, { times: 1 });
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  await expect(page.getByText(/Chưa xác định được kết quả tạo khách hàng/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Thử lại", exact: true }).click();
  await expect(page.getByTestId("lookup-result")).toContainText("Khách mất phản hồi FE03");
  expect(customerPosts).toBe(1);
  await page.route(/\/api\/customers\/\d+\/devices$/, async route => { await route.fetch(); await route.abort("failed"); }, { times: 1 });
  await newDevice(page, "00LostResponse");
  await expect(page.getByText(/Chưa xác định được kết quả ghi nhận thiết bị/)).toBeVisible();
  await expect(page.getByRole("button", { name: "Ghi nhận thiết bị", exact: true })).toBeDisabled();
  await page.getByRole("button", { name: "Kiểm tra lại Serial/IMEI", exact: true }).click();
  await expect(page.getByTestId("selected-device")).toContainText("00LostResponse");
  expect(devicePosts).toBe(1);
  await page.screenshot({ path: resolve(output, "intake-recovered.png"), fullPage: true });
});

test("FE03-UI08 Unicode name/address/serial và bố cục gộp trên desktop/mobile", async ({ page }) => {
  await lookup(page, "0886330011");
  await page.getByLabel("Họ tên khách hàng mới").fill("😀".repeat(121));
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  await expect(page.getByText("Họ tên tối đa 120 ký tự.", { exact: true })).toBeVisible();
  await page.getByLabel("Họ tên khách hàng mới").fill("Khách Unicode FE03");
  await page.getByLabel("Địa chỉ (không bắt buộc)").fill("😀".repeat(256));
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  await expect(page.getByText("Địa chỉ tối đa 255 ký tự.", { exact: true })).toBeVisible();
  await page.getByLabel("Địa chỉ (không bắt buộc)").fill("Địa chỉ hợp lệ");
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  await expect(page.getByLabel("Sản phẩm", { exact: true })).toBeVisible();
  await newDevice(page, "😀".repeat(51));
  await expect(page.getByText("Serial / IMEI tối đa 50 ký tự.", { exact: true })).toBeVisible();
  await newDevice(page, "😀".repeat(50));
  await expect(page.getByTestId("selected-device")).toBeVisible();
  await expect(page.getByLabel("Nhóm sự cố")).toBeVisible();
  for (const width of [1920, 1280, 768, 375]) {
    await page.setViewportSize({ width, height: 1000 });
    await expect.poll(() => page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(true);
    await page.screenshot({ path: resolve(output, "intake-" + width + ".png"), fullPage: true });
  }
});
