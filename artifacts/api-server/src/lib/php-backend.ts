import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { logger } from "./logger";

function findAvailablePort(): Promise<number> {
  return new Promise((resolve, reject) => {
    import("node:net")
      .then(({ createServer }) => {
        const server = createServer();
        server.once("error", reject);
        server.listen(0, "127.0.0.1", () => {
          const address = server.address();
          if (!address || typeof address === "string") {
            server.close();
            reject(new Error("Could not allocate a local PHP backend port"));
            return;
          }

          const port = address.port;
          server.close((error) => {
            if (error) reject(error);
            else resolve(port);
          });
        });
      })
      .catch(reject);
  });
}

export type PhpBackend = {
  port: number;
  stop: () => void;
};

export async function startPhpBackend(): Promise<PhpBackend> {
  const port = await findAvailablePort();
  const serverDir = path.dirname(fileURLToPath(import.meta.url));
  const phpDir = path.resolve(serverDir, "../php");
  const publicDir = path.join(phpDir, "public");
  const routerFile = path.join(publicDir, "index.php");
  const child = spawn(
    "php",
    ["-S", `127.0.0.1:${port}`, "-t", publicDir, routerFile],
    { cwd: phpDir, stdio: ["ignore", "ignore", "pipe"] },
  );

  let stderrBuffer = "";
  child.stderr?.on("data", (chunk: Buffer) => {
    stderrBuffer += chunk.toString();
    const lines = stderrBuffer.split(/\r?\n/);
    stderrBuffer = lines.pop() ?? "";

    for (const line of lines) {
      if (/PHP (Fatal error|Parse error|Warning)|Uncaught (Error|Exception)/i.test(line)) {
        logger.error({ detail: line }, "PHP backend reported an error");
      }
    }
  });

  const stop = () => {
    if (child.exitCode === null && !child.killed) child.kill("SIGTERM");
  };

  child.once("error", (error) => {
    logger.error({ err: error }, "Could not start PHP backend");
  });

  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (child.exitCode !== null) {
      throw new Error(`PHP backend exited during startup (${child.exitCode})`);
    }

    try {
      const response = await fetch(`http://127.0.0.1:${port}/`, {
        signal: AbortSignal.timeout(500),
      });
      await response.body?.cancel();
      logger.info({ port }, "PHP backend is ready");
      return { port, stop };
    } catch {
      await new Promise((resolve) => setTimeout(resolve, 200));
    }
  }

  stop();
  throw new Error("PHP backend did not start within 10 seconds");
}