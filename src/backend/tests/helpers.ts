import { readFile } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import { once } from "node:events";
import type { Express } from "express";
import { validateReference } from "../src/reference-config.ts";
import { makeCredential } from "../src/credentials.ts";
import type { Credential } from "../src/credentials.ts";

export async function referenceInput() {
  return JSON.parse(await readFile(new URL("../config/reference.demo.json", import.meta.url), "utf8"));
}
export async function testIdentity() {
  const config = validateReference(await referenceInput());
  const password = " " + randomBytes(24).toString("base64url") + " ";
  const credentials: Credential[] = [];
  for (const account of config.accounts) credentials.push(await makeCredential(account.employee_id, password));
  return { config, password, credentials };
}
export async function serve(app: Express) {
  const server = app.listen(0, "127.0.0.1");
  await once(server, "listening");
  const address = server.address();
  if (!address || typeof address === "string") throw new Error("Test server address missing.");
  return {
    url: "http://127.0.0.1:" + address.port,
    close: () => new Promise<void>((resolve, reject) => {
      server.closeAllConnections();
      server.close(error => error ? reject(error) : resolve());
    }),
  };
}
