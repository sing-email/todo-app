import { describe, it, expect, afterEach, vi } from "vitest";
import http from "node:http";
import { createApp } from "./server.js";
import { TodoStore } from "./todo.js";

function request(
  server: http.Server,
  path: string,
  options?: { method?: string; body?: unknown },
): Promise<{ status: number; headers: http.IncomingHttpHeaders; body: string }> {
  return new Promise((resolve, reject) => {
    const addr = server.address();
    if (!addr || typeof addr === "string") return reject(new Error("no address"));
    const method = options?.method ?? "GET";
    const reqBody = options?.body !== undefined ? JSON.stringify(options.body) : undefined;
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

describe("request logging", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("logs method and path to stdout for each request", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    server = createApp(new TodoStore()).listen(0);

    await request(server, "/health");
    expect(logSpy).toHaveBeenCalledWith("GET /health");

    await request(server, "/todos", { method: "POST", body: { title: "Test" } });
    expect(logSpy).toHaveBeenCalledWith("POST /todos");

    await request(server, "/todos");
    expect(logSpy).toHaveBeenCalledWith("GET /todos");

    logSpy.mockRestore();
  });

  it("logs method and path for unknown routes", async () => {
    const logSpy = vi.spyOn(console, "log").mockImplementation(() => {});
    server = createApp(new TodoStore()).listen(0);

    await request(server, "/unknown");
    expect(logSpy).toHaveBeenCalledWith("GET /unknown");

    logSpy.mockRestore();
  });
});

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

  it("returns 404 for POST /health", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/health", { method: "POST" });
    expect(res.status).toBe(404);
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

  it("returns 400 when title is missing", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos", {
      method: "POST",
      body: {},
    });
    expect(res.status).toBe(400);
  });
});

describe("DELETE /todos/:id", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 when todo exists", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "To delete" },
    });
    const todo = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${todo.id}`, { method: "DELETE" });
    expect(res.status).toBe(200);

    const listRes = await request(server, "/todos");
    expect(JSON.parse(listRes.body).items).toEqual([]);
  });

  it("returns 404 when todo does not exist", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos/nonexistent-id", { method: "DELETE" });
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "Todo not found" });
  });

  it("strips query string when extracting ID", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Query test" },
    });
    const todo = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${todo.id}?foo=bar`, { method: "DELETE" });
    expect(res.status).toBe(200);

    const listRes = await request(server, "/todos");
    expect(JSON.parse(listRes.body).items).toEqual([]);
  });

  it("returns 404 for extra path segments", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Segment test" },
    });
    const todo = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${todo.id}/extra`, { method: "DELETE" });
    expect(res.status).toBe(404);
  });

  it("returns 404 for trailing slash with no ID", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos/", { method: "DELETE" });
    expect(res.status).toBe(404);
  });
});

describe("GET /todos/:id", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 with the todo JSON when todo exists", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Fetch me" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    expect(JSON.parse(res.body)).toEqual(created);
  });

  it("returns 404 when todo does not exist", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos/nonexistent-id");
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "Todo not found" });
  });
});

describe("PUT /todos/:id", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 with the updated todo", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Old title" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}`, {
      method: "PUT",
      body: { title: "New title" },
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const updated = JSON.parse(res.body);
    expect(updated.title).toBe("New title");
    expect(updated.id).toBe(created.id);
    expect(updated.completed).toBe(false);
  });

  it("returns 404 when todo does not exist", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos/nonexistent-id", {
      method: "PUT",
      body: { title: "New title" },
    });
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "Todo not found" });
  });

  it("returns 400 when title is missing", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Old title" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}`, {
      method: "PUT",
      body: {},
    });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "title is required" });
  });

  it("returns 400 when title is empty string", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Old title" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}`, {
      method: "PUT",
      body: { title: "" },
    });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "title is required" });
  });

  it("returns 400 when title is whitespace-only", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Old title" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}`, {
      method: "PUT",
      body: { title: "   " },
    });
    expect(res.status).toBe(400);
  });
});

describe("PATCH /todos/:id/complete", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 and marks a todo as completed", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Mark me done" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}/complete`, {
      method: "PATCH",
      body: { completed: true },
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const updated = JSON.parse(res.body);
    expect(updated.id).toBe(created.id);
    expect(updated.title).toBe("Mark me done");
    expect(updated.completed).toBe(true);
  });

  it("returns 200 and marks a todo as incomplete", async () => {
    const store = new TodoStore();
    const todo = store.add("Already done");
    store.setCompleted(todo.id, true);
    server = createApp(store).listen(0);

    const res = await request(server, `/todos/${todo.id}/complete`, {
      method: "PATCH",
      body: { completed: false },
    });
    expect(res.status).toBe(200);
    const updated = JSON.parse(res.body);
    expect(updated.completed).toBe(false);
  });

  it("returns 404 when todo does not exist", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos/nonexistent/complete", {
      method: "PATCH",
      body: { completed: true },
    });
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "Todo not found" });
  });

  it("returns 400 when completed field is missing", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Test" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}/complete`, {
      method: "PATCH",
      body: {},
    });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "completed is required" });
  });

  it("returns 400 when completed field is not a boolean", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Test" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}/complete`, {
      method: "PATCH",
      body: { completed: "yes" },
    });
    expect(res.status).toBe(400);
    expect(JSON.parse(res.body)).toEqual({ error: "completed is required" });
  });
});

describe("GET /version", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 with JSON containing a version field", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/version");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("version");
    expect(typeof body.version).toBe("string");
    expect(body.version).toMatch(/^\d+\.\d+\.\d+/);
  });
});

describe("GET /todos", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 200 with envelope containing empty items when no todos exist", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const body = JSON.parse(res.body);
    expect(body).toEqual({
      items: [],
      pagination: { cursor: null, hasMore: false, total: 0 },
    });
  });

  it("returns 200 with todos in envelope after creating one", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    await request(server, "/todos", {
      method: "POST",
      body: { title: "Walk the dog" },
    });
    const res = await request(server, "/todos");
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toHaveLength(1);
    expect(body.items[0].title).toBe("Walk the dog");
    expect(body.pagination.total).toBe(1);
  });

  // AC1: Requesting the todo list returns a page of results (default 20) rather than the full list
  it("AC1: returns at most 20 items by default", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 25; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);
    const res = await request(server, "/todos");
    const body = JSON.parse(res.body);
    expect(body.items).toHaveLength(20);
    expect(body.pagination.total).toBe(25);
  });

  // AC2: Each page response includes a cursor I can use to fetch the next page
  it("AC2: cursor from first page fetches the next page", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 25; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);

    const page1 = JSON.parse((await request(server, "/todos")).body);
    expect(page1.pagination.cursor).toEqual(expect.any(String));

    const page2 = JSON.parse(
      (await request(server, `/todos?cursor=${page1.pagination.cursor}`)).body,
    );
    expect(page2.items).toHaveLength(5);
    // Pages should not overlap
    const page1Ids = new Set(page1.items.map((t: { id: string }) => t.id));
    for (const item of page2.items) {
      expect(page1Ids.has(item.id)).toBe(false);
    }
  });

  // AC3: Each page response tells me whether more pages exist
  it("AC3: hasMore is true when more pages exist, false on last page", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 25; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);

    const page1 = JSON.parse((await request(server, "/todos")).body);
    expect(page1.pagination.hasMore).toBe(true);

    const page2 = JSON.parse(
      (await request(server, `/todos?cursor=${page1.pagination.cursor}`)).body,
    );
    expect(page2.pagination.hasMore).toBe(false);
    expect(page2.pagination.cursor).toBeNull();
  });

  // AC4: Each page response includes the total number of todos
  it("AC4: total reflects the full count across all pages", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 25; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);

    const page1 = JSON.parse((await request(server, "/todos")).body);
    expect(page1.pagination.total).toBe(25);

    const page2 = JSON.parse(
      (await request(server, `/todos?cursor=${page1.pagination.cursor}`)).body,
    );
    expect(page2.pagination.total).toBe(25);
  });

  // AC5: I can control how many todos appear per page via a limit query parameter
  it("AC5: limit query parameter controls page size", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 10; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);

    const res = await request(server, "/todos?limit=3");
    const body = JSON.parse(res.body);
    expect(body.items).toHaveLength(3);
    expect(body.pagination.hasMore).toBe(true);
    expect(body.pagination.total).toBe(10);
  });

  // AC6: Requesting with an invalid cursor returns a clear error message
  it("AC6: invalid cursor returns 400 with error message", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos?cursor=not-a-valid-cursor");
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
    expect(body.error).toMatch(/cursor/i);
  });

  // AC7: Response uses consistent envelope format (items, pagination metadata)
  it("AC7: response uses envelope with items and pagination keys", async () => {
    const store = new TodoStore();
    store.add("Test");
    server = createApp(store).listen(0);

    const res = await request(server, "/todos");
    const body = JSON.parse(res.body);
    expect(body).toHaveProperty("items");
    expect(body).toHaveProperty("pagination");
    expect(body.pagination).toHaveProperty("cursor");
    expect(body.pagination).toHaveProperty("hasMore");
    expect(body.pagination).toHaveProperty("total");
    expect(Array.isArray(body.items)).toBe(true);
  });
});

describe("POST /todos/:id/tags", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("AC1: adds a tag to a todo and returns 200 with tags array", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Buy milk" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}/tags`, {
      method: "POST",
      body: { tag: "urgent" },
    });
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const updated = JSON.parse(res.body);
    expect(updated.id).toBe(created.id);
    expect(updated.tags).toEqual(["urgent"]);
  });

  it("AC2: adds multiple tags accumulating in the array", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Buy milk" },
    });
    const created = JSON.parse(createRes.body);

    await request(server, `/todos/${created.id}/tags`, {
      method: "POST",
      body: { tag: "urgent" },
    });

    const res = await request(server, `/todos/${created.id}/tags`, {
      method: "POST",
      body: { tag: "work" },
    });
    expect(res.status).toBe(200);
    const updated = JSON.parse(res.body);
    expect(updated.tags).toEqual(["urgent", "work"]);
  });

  it("AC3: rejects duplicate tag with 409", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Buy milk" },
    });
    const created = JSON.parse(createRes.body);

    await request(server, `/todos/${created.id}/tags`, {
      method: "POST",
      body: { tag: "urgent" },
    });

    const res = await request(server, `/todos/${created.id}/tags`, {
      method: "POST",
      body: { tag: "urgent" },
    });
    expect(res.status).toBe(409);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });

  it("AC4: returns 404 when todo does not exist", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos/nonexistent/tags", {
      method: "POST",
      body: { tag: "urgent" },
    });
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "Todo not found" });
  });

  it("AC5: returns 400 when tag field is missing", async () => {
    const store = new TodoStore();
    server = createApp(store).listen(0);
    const createRes = await request(server, "/todos", {
      method: "POST",
      body: { title: "Buy milk" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/todos/${created.id}/tags`, {
      method: "POST",
      body: {},
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });
});
