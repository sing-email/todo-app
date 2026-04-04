import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TodoStore } from "./todo.js";
import { ProjectStore } from "./project.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
const appVersion: string = pkg.version;

export function createApp(todoStore: TodoStore, projectStore?: ProjectStore): http.Server {
  return http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    const { pathname } = new URL(req.url ?? "/", "http://localhost");

    if (req.method === "GET" && pathname === "/version") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ version: appVersion }));
      return;
    }

    if (req.method === "GET" && pathname === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method === "GET" && pathname === "/todos") {
      const url = new URL(req.url ?? "/", "http://localhost");
      const limitParam = url.searchParams.get("limit");
      const cursorParam = url.searchParams.get("cursor");

      let limit = 20;
      if (limitParam !== null) {
        const parsed = Number(limitParam);
        if (!Number.isInteger(parsed) || parsed < 1) {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "limit must be a positive integer" }));
          return;
        }
        limit = parsed;
      }

      try {
        const result = todoStore.listPaginated(limit, cursorParam ?? undefined);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          items: result.items,
          pagination: {
            cursor: result.cursor,
            hasMore: result.hasMore,
            total: result.total,
          },
        }));
      } catch (err) {
        const message = err instanceof Error ? err.message : "Invalid cursor";
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: message }));
      }
      return;
    }

    if (req.method === "POST" && pathname === "/todos") {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (typeof parsed.title !== "string" || parsed.title.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "title is required" }));
            return;
          }
          const todo = todoStore.add(parsed.title);
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(todo));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Invalid JSON";
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    const tagsSegments = pathname.match(/^\/todos\/([^/]+)\/tags$/);
    if (req.method === "POST" && tagsSegments) {
      const id = decodeURIComponent(tagsSegments[1]);
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (typeof parsed.tag !== "string" || parsed.tag.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "tag is required" }));
            return;
          }
          const todo = todoStore.addTag(id, parsed.tag);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(todo));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Invalid JSON";
          if (message === "Todo not found") {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          } else if (message === "Tag already exists") {
            res.writeHead(409, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          }
        }
      });
      return;
    }

    const completeSegments = pathname.match(/^\/todos\/([^/]+)\/complete$/);
    if (req.method === "PATCH" && completeSegments) {
      const id = decodeURIComponent(completeSegments[1]);
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (typeof parsed.completed !== "boolean") {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "completed is required" }));
            return;
          }
          const todo = todoStore.setCompleted(id, parsed.completed);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(todo));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Invalid JSON";
          if (message === "Todo not found") {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          }
        }
      });
      return;
    }

    const todoSegments = pathname.match(/^\/todos\/([^/]+)$/);
    if (req.method === "GET" && todoSegments) {
      const id = decodeURIComponent(todoSegments[1]);
      const todo = todoStore.get(id);
      if (todo) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify(todo));
      } else {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Todo not found" }));
      }
      return;
    }

    if (req.method === "PUT" && todoSegments) {
      const id = decodeURIComponent(todoSegments[1]);
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (typeof parsed.title !== "string" || parsed.title.length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "title is required" }));
            return;
          }
          const todo = todoStore.updateTitle(id, parsed.title);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify(todo));
        } catch (err) {
          const message =
            err instanceof Error ? err.message : "Invalid JSON";
          if (message === "Todo not found") {
            res.writeHead(404, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          } else {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: message }));
          }
        }
      });
      return;
    }

    if (req.method === "DELETE" && todoSegments) {
      const id = decodeURIComponent(todoSegments[1]);
      try {
        todoStore.delete(id);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ success: true }));
      } catch {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "Todo not found" }));
      }
      return;
    }

    if (req.method === "POST" && pathname === "/projects" && projectStore) {
      let body = "";
      req.on("data", (chunk) => (body += chunk));
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          if (typeof parsed.name !== "string" || parsed.name.trim().length === 0) {
            res.writeHead(400, { "Content-Type": "application/json" });
            res.end(JSON.stringify({ error: "name is required" }));
            return;
          }
          const project = projectStore.add(parsed.name);
          res.writeHead(201, { "Content-Type": "application/json" });
          res.end(JSON.stringify(project));
        } catch (err) {
          const message = err instanceof Error ? err.message : "Invalid JSON";
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: message }));
        }
      });
      return;
    }

    if (req.method === "GET" && pathname === "/projects" && projectStore) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(projectStore.list()));
      return;
    }

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });
}
