import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { randomBytes, randomInt } from "node:crypto";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const require = createRequire(new URL("../src/frontend/package.json", import.meta.url));
const { chromium, expect } = require("@playwright/test");
const args = process.argv.slice(2), option = name => args[args.indexOf(name) + 1];
let browser, stage = "configuration";
try {
  assert.ok(args.includes("--confirm-isolated-compose"));
  const base = option("--url"), credentialFile = option("--credentials"), output = option("--output");
  assert.ok(base && ["127.0.0.1", "localhost"].includes(new URL(base).hostname) && credentialFile && output);
  const credentials = JSON.parse(await readFile(credentialFile, "utf8"));
  const account = credentials.find(value => value.username === "nv_demo_a"); assert.ok(account);
  await mkdir(output, { recursive: true });
  browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1920, height: 1080 } });
  stage = "login"; await page.goto(base + "/login");
  await page.getByLabel("Tên đăng nhập", { exact: true }).fill(account.username);
  await page.getByLabel("Mật khẩu", { exact: true }).fill(account.password);
  await page.getByRole("button", { name: "Đăng nhập", exact: true }).click();
  stage = "customer";
  await page.getByLabel("Số điện thoại tra cứu").fill("08" + randomInt(10000000, 99999999));
  await page.getByRole("button", { name: "Tra cứu", exact: true }).click();
  await page.getByLabel("Họ tên khách hàng mới").fill("Khách kiểm thử Compose FE07");
  await page.getByRole("button", { name: "Tạo khách hàng và chọn", exact: true }).click();
  stage = "device";
  await page.getByLabel("Sản phẩm", { exact: true }).selectOption("101");
  await page.getByLabel("Serial / IMEI", { exact: true }).fill("FE07-COMPOSE-" + randomBytes(5).toString("hex"));
  await page.getByRole("button", { name: "Ghi nhận thiết bị", exact: true }).click();
  stage = "ticket";
  await expect(page.getByTestId("warranty-preview")).toBeVisible();
  await page.getByLabel("Mô tả lỗi", { exact: true }).fill("Kiểm tra tiếp nhận qua UI production trong Compose");
  await page.getByLabel("Nhóm sự cố").selectOption("3"); await page.getByLabel("Mức ưu tiên").selectOption("CAO");
  await page.getByRole("button", { name: "Tạo phiếu bảo hành", exact: true }).click();
  await expect(page.getByTestId("ticket-receipt")).toBeVisible();
  await page.getByRole("link", { name: "Mở chi tiết phiếu", exact: true }).click();
  stage = "detail";
  await expect(page.getByTestId("ticket-status")).toHaveAttribute("data-value", "MOI");
  await expect(page.getByTestId("approval-status")).toHaveText("Chờ phê duyệt");
  await expect(page.getByTestId("due-date")).toHaveAttribute("datetime", /\+07:00$/);
  await expect(page.getByTestId("ticket-phone")).toHaveText(/^\d{3}\*{4}\d{3}$/);
  await page.screenshot({ path: resolve(output, "compose-ui-detail.png"), fullPage: true });
  await page.getByRole("button", { name: "Đăng xuất" }).click();
  await expect(page.getByLabel("Tên đăng nhập", { exact: true })).toBeVisible();
  console.log(JSON.stringify({ compose_browser_smoke: "PASS", flow: "login → customer → device → ticket → detail → logout", production: true }));
} catch {
  // Không in lỗi Playwright vì call log của thao tác fill có thể chứa mật khẩu.
  console.error("COMPOSE_BROWSER_SMOKE_FAILED: " + stage); process.exitCode = 1;
} finally { await browser?.close(); }
