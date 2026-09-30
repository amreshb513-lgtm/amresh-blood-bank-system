import express, { type Express } from "express";
import cors from "cors";
import { request as httpRequest } from "node:http";
import pinoHttp from "pino-http";
import router from "./routes";
import { logger } from "./lib/logger";

const app: Express = express();

app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return {
          statusCode: res.statusCode,
        };
      },
    },
  }),
);
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(["/api/donors", "/api/dashboard/summary"], (req, res) => {
  const port = app.locals.phpBackendPort as number | undefined;

  if (!port) {
    res.status(503).json({ error: "PHP backend is not ready" });
    return;
  }

  const requestBody =
    req.body === undefined ? undefined : JSON.stringify(req.body);
  const headers = {
    ...req.headers,
    host: `127.0.0.1:${port}`,
    connection: "close",
  };
  delete headers["transfer-encoding"];
  if (requestBody !== undefined) {
    headers["content-length"] = String(Buffer.byteLength(requestBody));
  }

  const upstream = httpRequest(
    {
      hostname: "127.0.0.1",
      port,
      method: req.method,
      path: req.originalUrl,
      headers,
    },
    (upstreamResponse) => {
      res.statusCode = upstreamResponse.statusCode ?? 502;

      for (const [name, value] of Object.entries(upstreamResponse.headers)) {
        if (
          value !== undefined &&
          ![
            "connection",
            "keep-alive",
            "proxy-authenticate",
            "proxy-authorization",
            "te",
            "trailers",
            "transfer-encoding",
            "upgrade",
          ].includes(name)
        ) {
          res.setHeader(name, value);
        }
      }

      upstreamResponse.pipe(res);
    },
  );

  upstream.on("error", (error) => {
    req.log.error({ err: error }, "PHP backend request failed");
    if (!res.headersSent) {
      res.status(502).json({ error: "Could not reach the PHP backend" });
    } else {
      res.destroy(error);
    }
  });

  if (requestBody !== undefined) {
    upstream.end(requestBody);
  } else {
    req.pipe(upstream);
  }
});

app.use("/api", router);

export default app;
