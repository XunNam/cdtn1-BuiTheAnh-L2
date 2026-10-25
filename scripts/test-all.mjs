import { spawnSync } from "node:child_process";
const npm = process.platform === "win32" ? "npm.cmd" : "npm";
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: process.platform === "win32", env: { ...process.env, NEXT_TELEMETRY_DISABLED: "1" } });
  if (result.status !== 0) process.exit(result.status ?? 1);
}
for (const task of ["typecheck", "test", "test:db", "build"]) run(npm, ["--prefix", "src/backend", "run", task]);
for (const task of ["typecheck", "lint", "test", "build"]) run(npm, ["--prefix", "src/frontend", "run", task]);
run(process.execPath, ["src/backend/scripts/ui-test.ts"]);
