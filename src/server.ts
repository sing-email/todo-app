import http from "node:http";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { TodoStore } from "./todo.js";

const __dirname = dirname(fileURLToPath(import.meta.url));
const pkg = JSON.parse(readFileSync(join(__dirname, "..", "package.json"), "utf-8"));
const appVersion: string = pkg.version;

export function createApp(todoStore: TodoStore): http.Server {
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
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(todoStore.list()));
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

    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "Not Found" }));
  });
}
