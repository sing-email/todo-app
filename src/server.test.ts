import { describe, it, expect, afterEach, vi } from "vitest";
import http from "node:http";
import { createApp } from "./server.js";
import { TodoStore } from "./todo.js";
import { ProjectStore } from "./project.js";

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

  it("AC1: returns a page of results with default limit of 20", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 25; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);
    const res = await request(server, "/todos");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const body = JSON.parse(res.body);
    expect(body.items).toHaveLength(20);
  });

  it("AC2: includes a cursor to fetch the next page", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 25; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);
    const res = await request(server, "/todos");
    const body = JSON.parse(res.body);
    expect(body.pagination.cursor).toEqual(expect.any(String));

    // Use the cursor to fetch the next page
    const res2 = await request(server, `/todos?cursor=${body.pagination.cursor}`);
    const body2 = JSON.parse(res2.body);
    expect(res2.status).toBe(200);
    expect(body2.items).toHaveLength(5);
    // No overlap between pages
    const ids1 = body.items.map((t: { id: string }) => t.id);
    const ids2 = body2.items.map((t: { id: string }) => t.id);
    expect(ids1.filter((id: string) => ids2.includes(id))).toHaveLength(0);
  });

  it("AC3: tells me whether more pages exist", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 25; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);

    const res1 = await request(server, "/todos");
    const body1 = JSON.parse(res1.body);
    expect(body1.pagination.hasMore).toBe(true);

    const res2 = await request(server, `/todos?cursor=${body1.pagination.cursor}`);
    const body2 = JSON.parse(res2.body);
    expect(body2.pagination.hasMore).toBe(false);
    expect(body2.pagination.cursor).toBeNull();
  });

  it("AC4: includes the total number of todos", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 25; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);

    const res = await request(server, "/todos");
    const body = JSON.parse(res.body);
    expect(body.pagination.total).toBe(25);

    // Total stays the same on subsequent pages
    const res2 = await request(server, `/todos?cursor=${body.pagination.cursor}`);
    const body2 = JSON.parse(res2.body);
    expect(body2.pagination.total).toBe(25);
  });

  it("AC5: controls page size via limit query parameter", async () => {
    const store = new TodoStore();
    for (let i = 0; i < 10; i++) {
      store.add(`Todo ${i}`);
    }
    server = createApp(store).listen(0);

    const res = await request(server, "/todos?limit=3");
    const body = JSON.parse(res.body);
    expect(res.status).toBe(200);
    expect(body.items).toHaveLength(3);
    expect(body.pagination.hasMore).toBe(true);
    expect(body.pagination.total).toBe(10);
  });

  it("AC6: returns 400 for non-numeric limit", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos?limit=abc");
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });

  it("AC6: returns 400 for zero limit", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos?limit=0");
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });

  it("AC6: returns 400 for negative limit", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos?limit=-5");
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });

  it("AC7: returns 400 for invalid cursor", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos?cursor=not-a-valid-cursor");
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });

  it("AC8: uses consistent envelope format with items and pagination", async () => {
    const store = new TodoStore();
    store.add("Test todo");
    server = createApp(store).listen(0);

    const res = await request(server, "/todos");
    const body = JSON.parse(res.body);

    // Envelope has exactly items and pagination keys
    expect(Object.keys(body).sort()).toEqual(["items", "pagination"]);
    // Pagination has exactly cursor, hasMore, total
    expect(Object.keys(body.pagination).sort()).toEqual(["cursor", "hasMore", "total"]);
    // Items contain todo objects
    expect(body.items[0]).toMatchObject({
      id: expect.any(String),
      title: "Test todo",
      completed: false,
      createdAt: expect.any(String),
      tags: [],
    });
  });

  it("returns empty items array when no todos exist", async () => {
    server = createApp(new TodoStore()).listen(0);
    const res = await request(server, "/todos");
    expect(res.status).toBe(200);
    const body = JSON.parse(res.body);
    expect(body.items).toEqual([]);
    expect(body.pagination.total).toBe(0);
    expect(body.pagination.hasMore).toBe(false);
    expect(body.pagination.cursor).toBeNull();
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

describe("POST /projects", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("AC1: creates a project by providing a name and returns 201", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const res = await request(server, "/projects", {
      method: "POST",
      body: { name: "Work" },
    });
    expect(res.status).toBe(201);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("AC2: returns the created project with its ID and name", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const res = await request(server, "/projects", {
      method: "POST",
      body: { name: "Work" },
    });
    const project = JSON.parse(res.body);
    expect(project.id).toEqual(expect.any(String));
    expect(project.name).toBe("Work");
    expect(project.createdAt).toEqual(expect.any(String));
  });

  it("AC3: returns 400 when name is missing", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const res = await request(server, "/projects", {
      method: "POST",
      body: {},
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });

  it("AC3: returns 400 when name is empty string", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const res = await request(server, "/projects", {
      method: "POST",
      body: { name: "" },
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });

  it("AC3: returns 400 when name is whitespace-only", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const res = await request(server, "/projects", {
      method: "POST",
      body: { name: "   " },
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toEqual(expect.any(String));
  });

  it("returns 400 when project name already exists", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    await request(server, "/projects", {
      method: "POST",
      body: { name: "Work" },
    });

    const res = await request(server, "/projects", {
      method: "POST",
      body: { name: "Work" },
    });
    expect(res.status).toBe(400);
    const body = JSON.parse(res.body);
    expect(body.error).toMatch(/already exists/);
  });

  it("returns 400 for invalid JSON body", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const addr = server.address();
    if (!addr || typeof addr === "string") throw new Error("no address");
    const res = await new Promise<{ status: number; body: string }>((resolve, reject) => {
      const req = http.request(
        { hostname: "127.0.0.1", port: addr.port, path: "/projects", method: "POST", headers: { "Content-Type": "application/json", "Content-Length": 11 } },
        (res) => {
          let body = "";
          res.on("data", (chunk) => (body += chunk));
          res.on("end", () => resolve({ status: res.statusCode!, body }));
          res.on("error", reject);
        },
      );
      req.on("error", reject);
      req.write("not-valid{}");
      req.end();
    });
    expect(res.status).toBe(400);
  });
});

describe("GET /projects", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("AC1: retrieves a list of all projects", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const res = await request(server, "/projects");
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
    const projects = JSON.parse(res.body);
    expect(Array.isArray(projects)).toBe(true);
    expect(projects.length).toBeGreaterThanOrEqual(1);
  });

  it("AC2: Inbox always appears as the first project in the list", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    // Create projects before Inbox alphabetically
    await request(server, "/projects", { method: "POST", body: { name: "Alpha" } });
    await request(server, "/projects", { method: "POST", body: { name: "Beta" } });

    const res = await request(server, "/projects");
    const projects = JSON.parse(res.body);
    expect(projects[0].name).toBe("Inbox");
  });

  it("AC3: each project in the list includes its ID and name", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    await request(server, "/projects", { method: "POST", body: { name: "Work" } });

    const res = await request(server, "/projects");
    const projects = JSON.parse(res.body);
    for (const project of projects) {
      expect(project.id).toEqual(expect.any(String));
      expect(project.name).toEqual(expect.any(String));
    }
  });

  it("AC4: the list includes projects I have created", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    await request(server, "/projects", { method: "POST", body: { name: "Work" } });
    await request(server, "/projects", { method: "POST", body: { name: "Personal" } });

    const res = await request(server, "/projects");
    expect(res.status).toBe(200);
    const projects = JSON.parse(res.body);
    const names = projects.map((p: { name: string }) => p.name);
    expect(names).toContain("Inbox");
    expect(names).toContain("Work");
    expect(names).toContain("Personal");
  });

  it("returns only Inbox when no projects have been created", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const res = await request(server, "/projects");
    expect(res.status).toBe(200);
    const projects = JSON.parse(res.body);
    expect(projects).toHaveLength(1);
    expect(projects[0].name).toBe("Inbox");
  });

  it("returns 404 when no projectStore is configured", async () => {
    server = createApp(new TodoStore()).listen(0);

    const res = await request(server, "/projects");
    expect(res.status).toBe(404);
  });
});

describe("GET /projects/:id", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("AC1: retrieves a project by its ID", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const createRes = await request(server, "/projects", {
      method: "POST",
      body: { name: "Work" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/projects/${created.id}`);
    expect(res.status).toBe(200);
    expect(res.headers["content-type"]).toMatch(/application\/json/);
  });

  it("AC2: response includes the project's ID and name", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const createRes = await request(server, "/projects", {
      method: "POST",
      body: { name: "Work" },
    });
    const created = JSON.parse(createRes.body);

    const res = await request(server, `/projects/${created.id}`);
    const project = JSON.parse(res.body);
    expect(project.id).toBe(created.id);
    expect(project.name).toBe("Work");
    expect(project.createdAt).toEqual(expect.any(String));
  });

  it("AC3: returns 404 with error message when project does not exist", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const res = await request(server, "/projects/nonexistent-id");
    expect(res.status).toBe(404);
    expect(JSON.parse(res.body)).toEqual({ error: "Project not found" });
  });

  it("retrieves the Inbox project by ID", async () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    server = createApp(todoStore, projectStore).listen(0);

    const listRes = await request(server, "/projects");
    const inbox = JSON.parse(listRes.body)[0];

    const res = await request(server, `/projects/${inbox.id}`);
    expect(res.status).toBe(200);
    const project = JSON.parse(res.body);
    expect(project.id).toBe(inbox.id);
    expect(project.name).toBe("Inbox");
  });

  it("returns 404 when no projectStore is configured", async () => {
    server = createApp(new TodoStore()).listen(0);

    const res = await request(server, "/projects/some-id");
    expect(res.status).toBe(404);
  });
});

describe("POST /projects without projectStore", () => {
  let server: http.Server;

  afterEach(() => new Promise<void>((resolve) => server.close(() => resolve())));

  it("returns 404 when no projectStore is configured", async () => {
    server = createApp(new TodoStore()).listen(0);

    const res = await request(server, "/projects", {
      method: "POST",
      body: { name: "Work" },
    });
    expect(res.status).toBe(404);
  });
});
