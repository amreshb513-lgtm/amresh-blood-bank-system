import app from "./app";
import { logger } from "./lib/logger";
import { startPhpBackend } from "./lib/php-backend";

const rawPort = process.env["PORT"];

if (!rawPort) {
  throw new Error(
    "PORT environment variable is required but was not provided.",
  );
}

const port = Number(rawPort);

if (Number.isNaN(port) || port <= 0) {
  throw new Error(`Invalid PORT value: "${rawPort}"`);
}

async function start(): Promise<void> {
  const phpBackend = await startPhpBackend();
  app.locals.phpBackendPort = phpBackend.port;

  const server = app.listen(port, () => {
    logger.info({ port }, "Server listening");
  });

  server.on("error", (error) => {
    logger.error({ err: error }, "Error listening on port");
    phpBackend.stop();
    process.exit(1);
  });

  let isShuttingDown = false;
  const shutdown = (signal: NodeJS.Signals) => {
    if (isShuttingDown) return;
    isShuttingDown = true;
    logger.info({ signal }, "Stopping API and PHP services");
    phpBackend.stop();

    const forceExit = setTimeout(() => process.exit(0), 2_000);
    forceExit.unref();
    server.close(() => process.exit(0));
  };

  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void start().catch((error: unknown) => {
  logger.fatal({ err: error }, "Could not start API services");
  process.exit(1);
});