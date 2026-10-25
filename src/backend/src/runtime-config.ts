import { resolve } from "node:path";
import { configurationError } from "./errors.ts";

export const DATABASE_NAME = "mekong-mobile-l2";
export function runtimeConfig(env: NodeJS.ProcessEnv = process.env) {
  const required = (name: string) => {
    const value = env[name];
    if (!value || value.startsWith("<")) configurationError("Thiếu cấu hình " + name + ".");
    return value;
  };
  const integer = (name: string, fallback: string, max: number) => {
    const raw = env[name] ?? fallback;
    if (!/^[1-9]\d*$/.test(raw) || !Number.isSafeInteger(Number(raw)) || Number(raw) > max)
      configurationError("Cấu hình " + name + " không hợp lệ.");
    return Number(raw);
  };
  const host = required("DB_HOST"), database = required("DB_NAME");
  const deployment = env.L2_DEPLOYMENT ?? "local";
  if (deployment !== "local" && deployment !== "compose") configurationError("Môi trường L2 không hợp lệ.");
  const allowedHosts = deployment === "compose" ? ["database"] : ["localhost", "127.0.0.1", "::1"];
  if (!allowedHosts.includes(host) || database !== DATABASE_NAME)
    configurationError("Chỉ cho phép database local đã được chỉ định cho L2.");
  return Object.freeze({
    db: { host, database, port: integer("DB_PORT", "5432", 65535), user: required("DB_USER"), password: required("DB_PASSWORD") },
    port: integer("PORT", "3001", 65535), host: deployment === "compose" ? "0.0.0.0" : "127.0.0.1",
    referenceFile: resolve(env.REFERENCE_CONFIG_FILE ?? "config/reference.demo.json"),
    credentialFile: resolve(env.CREDENTIAL_FILE ?? ".private/credentials.json"),
    auth: { ttlSeconds: integer("AUTH_TTL_SECONDS", "3600", 86400), maxSessions: integer("AUTH_MAX_SESSIONS", "100", 100) },
  });
}
export type RuntimeConfig = ReturnType<typeof runtimeConfig>;
