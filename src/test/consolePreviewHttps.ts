import type { Buffer } from "node:buffer";
import { execFile, spawn, type ChildProcessWithoutNullStreams } from "node:child_process";
import { readFile, mkdtemp, rm, rmdir } from "node:fs/promises";
import { tmpdir } from "node:os";
import { isAbsolute, join } from "node:path";
import process from "node:process";

type PreviewFixture = {
  origin: string;
  ca: Buffer;
  providerCA?: Buffer;
  logs: () => string;
  close: () => Promise<void>;
};

// extraEnv selects optional fixture modes (for example KAFKA3O_TEST_CONSOLE_PREVIEW_COGNITO).
export async function consolePreviewHttps(gatewayDirectory: string, dist: string, extraEnv: Record<string, string> = {}): Promise<PreviewFixture> {
  const directory = await mkdtemp(join(tmpdir(), "kafka3o-preview-"));
  const executable = join(directory, process.platform === "win32" ? "console-fixture.exe" : "console-fixture");
  const workingDirectory = join(gatewayDirectory, "cmd", "console");
  let child: ChildProcessWithoutNullStreams | undefined;
  let exited: Promise<{ code: number | null; signal: string | null }> | undefined;
  let output = "";
  let errorOutput = "";
  try {
    await new Promise<void>((resolve, reject) => {
      execFile("go", ["test", "-c", "-o", executable], { cwd: workingDirectory, timeout: 90_000, windowsHide: true }, (error, stdout, stderr) => {
        if (error) reject(new Error(`Could not compile the Console fixture: ${error.message}\n${stdout}\n${stderr}`));
        else resolve();
      });
    });
    child = spawn(executable, ["-test.v", "-test.run=^TestConsolePreviewHTTPSFixture$", "-test.timeout=90s"], {
      cwd: workingDirectory,
      env: { ...process.env, ...extraEnv, KAFKA3O_TEST_CONSOLE_PREVIEW: "1", KAFKA3O_TEST_CONSOLE_PREVIEW_DIST: dist },
      windowsHide: true,
    });
    const processHandle = child;
    exited = new Promise((resolve) => processHandle.once("close", (code, signal) => resolve({ code, signal })));
    processHandle.stdout.setEncoding("utf8");
    processHandle.stderr.setEncoding("utf8");
    processHandle.stderr.on("data", (chunk: string) => { errorOutput = (errorOutput + chunk).slice(-65_536); });
    const ready = await new Promise<{ origin: string; caFile: string; providerCAFile?: string }>((resolve, reject) => {
      let pending = "";
      const timer = setTimeout(() => reject(new Error("Console fixture did not become ready")), 30_000);
      processHandle.once("error", (error) => { clearTimeout(timer); reject(error); });
      processHandle.once("close", (code, signal) => {
        clearTimeout(timer);
        reject(new Error(`Console fixture exited before readiness (${code ?? signal}): ${output}\n${errorOutput}`));
      });
      processHandle.stdout.on("data", (chunk: string) => {
        output = (output + chunk).slice(-65_536);
        pending += chunk;
        const lines = pending.split(/\r?\n/);
        pending = lines.pop() ?? "";
        for (const line of lines) {
          const prefix = "KAFKA3O_PREVIEW_READY=";
          if (!line.startsWith(prefix)) continue;
          try {
            const value: unknown = JSON.parse(line.slice(prefix.length));
            if (typeof value !== "object" || value === null || !("origin" in value) || !("caFile" in value) ||
                typeof value.origin !== "string" || typeof value.caFile !== "string") {
              throw new Error("Invalid Console fixture metadata");
            }
            const url = new URL(value.origin);
            const live = extraEnv.KAFKA3O_TEST_CONSOLE_PREVIEW_COGNITO === "environment";
            const providerCAFile = "providerCAFile" in value ? value.providerCAFile : undefined;
            if (url.protocol !== "https:" || url.hostname !== (live ? "localhost" : "127.0.0.1") || url.origin !== value.origin ||
                !isAbsolute(value.caFile) || (providerCAFile !== undefined && (typeof providerCAFile !== "string" || !isAbsolute(providerCAFile)))) {
              throw new Error("Console fixture is not a loopback HTTPS origin");
            }
            clearTimeout(timer);
            resolve({ origin: value.origin, caFile: value.caFile, providerCAFile: providerCAFile as string | undefined });
          } catch (error) {
            clearTimeout(timer);
            reject(error);
          }
        }
      });
    });
    const ca = await readFile(ready.caFile);
    const providerCA = ready.providerCAFile ? await readFile(ready.providerCAFile) : undefined;
    const exitResult = exited;
    return {
      origin: ready.origin,
      ca,
      providerCA,
      logs: () => output + errorOutput,
      close: async () => {
        try {
          if (processHandle.exitCode === null && processHandle.signalCode === null) {
            processHandle.stdin.end("stop\n");
          }
          const timeout = setTimeout(() => processHandle.kill(), 10_000);
          const result = await exitResult;
          clearTimeout(timeout);
          if (result.code !== 0) {
            throw new Error(`Console fixture failed (${result.code ?? result.signal}): ${output}\n${errorOutput}`);
          }
        } finally {
          await rm(executable, { force: true });
          await rmdir(directory);
        }
      },
    };
  } catch (error) {
    if (child && child.exitCode === null && child.signalCode === null) {
      child.kill();
      if (exited) await exited;
    }
    await rm(executable, { force: true });
    await rmdir(directory);
    throw error;
  }
}
