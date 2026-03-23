import { describe, it, expect, afterEach } from "vitest";
import http from "node:http";
import { createApp } from "./server.js";
import { TodoStore } from "./todo.js";

function request(
  server: http.Server,
  path: string,
  options?: { method?: string; body?: unknown; rawBody?: string },
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string") return reject(new Error("no address"));
    const method = options?.method ?? "GET";
    const reqBody = options?.rawBody ?? (options?.body !== undefined ? JSON.stringify(options.body) : undefined);
    const req = http.request(
      {
        hostname: "127.0.0.1",
        port: addr.port,
        path,
        method,
        headers: reqBody
          ? { "Content-Type": "application/json", "Content-Length": Buffer.byteLength(reqBody) }
          : undefined,
      },
      (res) => {
        let body = "";
        res.on("data", (chunk) => (body += chunk));
        res.on("end", () =>
          resolve({ status: res.statusCode!, headers: res.headers, body }),
        );
        res.on("error", reject);
      },
    );
    req.on("error", reject);
    if (reqBody) req.write(reqBody);
    req.end();
  });
}

describe("GET /health", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 with { status: 'ok' }", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/health");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual({ status: "ok" });
  });
});

describe("POST /todos", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 201 with the created todo", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos", {
      method: "POST",
      body: { title: "Buy milk" },
    });
    expect(res.status).toBe(201);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const todo = JSON.parse(res.body);
    expect(todo).toMatchObject({
      title: "Buy milk",
      completed: false,
    });
    expect(todo.id).toEqual(expect.any(String));
    expect(todo.createdAt).toEqual(expect.any(String));
  });

  it("returns 400 when title is whitespace-only", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos", {
      method: "POST",
      body: { title: "   " },
    });
    expect(res.status).toBe(400);
  });

  it("trims whitespace from title before storing", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos", {
      method: "POST",
      body: { title: "  Buy milk  " },
    });
    expect(res.status).toBe(201);
    const todo = JSON.parse(res.body);
    expect(todo.title).toBe("Buy milk");
  });

  it("returns 413 when body exceeds 1 MB", async () => {
    server = createApp(new TodoStore()).listen(0);
    const oversized = "x".repeat(1_048_577);
    const res = await request(server, "/todos", {
      method: "POST",
      rawBody: oversized,
    });
    expect(res.status).toBe(413);
    expect(JSON.parse(res.body)).toEqual({ error: "Payload Too Large" });
  });

  it("returns 400 when title is missing", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos", {
      method: "POST",
      body: {},
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /todos", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 with empty array when no todos exist", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual([]);
  });

  it("returns 200 with todos after creating one", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    await request(server, "/todos", {
      method: "POST",
      body: { title: "Walk the dog" },
    });
    const res = await request(server, "/todos");
    expect(res.status).toBe(200);
    const todos = JSON.parse(res.body);
    expect(todos).toHaveLength(1);
    expect(todos[0].title).toBe("Walk the dog");
  });
});
