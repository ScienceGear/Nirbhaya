import { execSync, spawnSync } from "node:child_process";

const isWindows = process.platform === "win32";
const ports = [8080, 8081, 8787];
const npmCommand = isWindows ? "npm.cmd" : "npm";

function run(command, args) {
  const result = spawnSync(command, args, {
    stdio: "inherit",
    shell: false,
  });

  if (result.error) {
    return 1;
  }

  return result.status ?? 0;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function getPidsOnPorts() {
  if (isWindows) {
    const output = execSync("netstat -ano", { encoding: "utf8" });
    const lines = output.split(/\r?\n/);
    const pids = new Set();

    for (const line of lines) {
      const normalized = line.trim().replace(/\s+/g, " ");
      if (!normalized.includes("LISTENING")) continue;

      for (const port of ports) {
        if (normalized.includes(`:${port} `)) {
          const parts = normalized.split(" ");
          const pid = Number(parts[parts.length - 1]);
          if (Number.isFinite(pid) && pid > 0) {
            pids.add(pid);
          }
        }
      }
    }

    return [...pids];
  }

  const pids = new Set();
  for (const port of ports) {
    try {
      const out = execSync(`lsof -ti tcp:${port}`, { encoding: "utf8" }).trim();
      if (!out) continue;
      for (const item of out.split(/\r?\n/)) {
        const pid = Number(item.trim());
        if (Number.isFinite(pid) && pid > 0) {
          pids.add(pid);
        }
      }
    } catch {
      continue;
    }
  }

  return [...pids];
}

async function main() {
  console.log("\n[reset:dev] Freeing dev ports 8080/8081/8787...");

  const pids = getPidsOnPorts();
  for (const pid of pids) {
    if (isWindows) {
      run("taskkill", ["/PID", String(pid), "/F"]);
    } else {
      run("kill", ["-9", String(pid)]);
    }
  }

  await sleep(700);

  console.log("[reset:dev] Restarting frontend + backend...\n");
  try {
    execSync(`${npmCommand} run dev`, { stdio: "inherit" });
    process.exit(0);
  } catch (error) {
    const status =
      typeof error === "object" && error !== null && "status" in error
        ? Number(error.status ?? 1)
        : 1;
    const failedCode = Number.isFinite(status) ? status : 1;
    process.exit(failedCode);
  }
}

main();
