import app from "./app";
import { logger } from "./lib/logger";

const DEFAULT_PORT = 5010;

const rawPort = process.env["PORT"];
let port = DEFAULT_PORT;

if (rawPort) {
  const parsed = Number(rawPort);

  if (Number.isNaN(parsed) || parsed <= 0) {
    throw new Error(`Invalid PORT value: "${rawPort}"`);
  }

  port = parsed;
} else {
  logger.warn(
    { defaultPort: DEFAULT_PORT },
    "PORT environment variable not set, falling back to default port",
  );
}

app.listen(port, (err) => {
  if (err) {
    logger.error({ err }, "Error listening on port");
    process.exit(1);
  }

  logger.info({ port }, "Server listening");
});
