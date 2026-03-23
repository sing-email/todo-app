import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { createApp } from "./server.js";

function request(
  server: http.Server,
  path: string,
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string") return reject(new Error("no address"));
    http.get(`http://127.0.0.1:${addr.port}${path}`, (res) => {
      let body = "";
      res.on("data", (chunk) => (body += chunk));
      res.on("end", () =>
        resolve({ status: res.statusCode!, headers: res.headers, body }),
      );
      res.on("error", reject);
    });
  });
}

describe("GET /health", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 with { status: 'ok' }", async () => {
    server = createApp().listen(0);
    const res = await request(server, "/health");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });
});
