import { randomBytes, scrypt, timingSafeEqual } from "node:crypto";
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import type { ReferenceConfig } from "./reference-config.ts";
import { configurationError } from "./errors.ts";

export type Credential = Readonly<{ employee_id: number; salt: string; hash: string; N: number; r: number; p: number; keylen: number }>;
const params = Object.freeze({ N: 32768, r: 8, p: 1, keylen: 64 });
function derive(password: string, salt: Buffer): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    scrypt(password, salt, params.keylen, { N: params.N, r: params.r, p: params.p, maxmem: 64 * 1024 * 1024 },
      (error, key) => error ? reject(error) : resolve(key));
  });
}
export async function makeCredential(employeeId: number, password: string): Promise<Credential> {
  const salt = randomBytes(16);
  const hash = await derive(password, salt);
  return Object.freeze({ employee_id: employeeId, salt: salt.toString("hex"), hash: hash.toString("hex"), ...params });
}
export function validateCredentials(input: unknown, config: ReferenceConfig): readonly Credential[] {
  if (!Array.isArray(input) || input.length !== config.accounts.length) configurationError("Credential thiếu tài khoản hoặc sai cấu trúc.");
  const result: Credential[] = [];
  const ids = new Set<number>();
  for (const raw of input) {
    if (!raw || typeof raw !== "object" || Array.isArray(raw)) configurationError("Credential sai cấu trúc.");
    const x = raw as Record<string, unknown>;
    const fields = ["employee_id", "salt", "hash", "N", "r", "p", "keylen"];
    if (Object.keys(x).length !== fields.length || fields.some(k => !Object.hasOwn(x, k))
      || typeof x.employee_id !== "number" || ids.has(x.employee_id)
      || !config.accounts.some(a => a.employee_id === x.employee_id)
      || typeof x.salt !== "string" || !/^[0-9a-f]{32,128}$/.test(x.salt) || x.salt.length % 2 !== 0
      || typeof x.hash !== "string" || !/^[0-9a-f]{128}$/.test(x.hash)
      || x.N !== params.N || x.r !== params.r || x.p !== params.p || x.keylen !== params.keylen)
      configurationError("Credential sai ID/hash/salt/tham số.");
    ids.add(x.employee_id);
    result.push(Object.freeze({
      employee_id: x.employee_id, salt: x.salt, hash: x.hash, ...params,
    }));
  }
  return Object.freeze(result);
}
export async function loadCredentials(file: string, config: ReferenceConfig): Promise<readonly Credential[]> {
  let input: unknown;
  try { input = JSON.parse(await readFile(file, "utf8")); } catch { configurationError("Không đọc được credential private."); }
  return validateCredentials(input, config);
}
export async function verifyPassword(password: string, credential: Credential): Promise<boolean> {
  const actual = await derive(password, Buffer.from(credential.salt, "hex"));
  const expected = Buffer.from(credential.hash, "hex");
  return actual.length === expected.length && timingSafeEqual(actual, expected);
}
export async function setupCredentials(file: string, config: ReferenceConfig): Promise<void> {
  // Không ghi đè credential đã có; plaintext sinh ngẫu nhiên chỉ ở vùng private bị ignore.
  const passwords = config.accounts.map(a => ({ username: a.username, password: randomBytes(24).toString("base64url") }));
  const credentials = [];
  for (let i = 0; i < config.accounts.length; i++) credentials.push(await makeCredential(config.accounts[i]!.employee_id, passwords[i]!.password));
  await mkdir(dirname(file), { recursive: true });
  await writeFile(file, JSON.stringify(credentials, null, 2) + "\n", { flag: "wx", mode: 0o600 });
  await writeFile(resolve(dirname(file), "demo-passwords.local.json"), JSON.stringify(passwords, null, 2) + "\n", { flag: "wx", mode: 0o600 });
}
