import http from "node:http";
import { TodoStore } from "./todo.js";

export function createApp(todoStore: TodoStore): http.Server {
  return http.createServer((req, res) => {
    if (req.method === "GET" && req.url === "/health") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ status: "ok" }));
      return;
    }

    if (req.method === "GET" && req.url === "/todos") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(todoStore.list()));
      return;
    }

    if (req.method === "POST" && req.url === "/todos") {
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

    if (req.method === "PUT" && req.url?.startsWith("/todos/")) {
      const id = req.url.slice("/todos/".length);
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
          const todo = todoStore.update(id, parsed.title);
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

    if (req.method === "DELETE" && req.url?.startsWith("/todos/")) {
      const id = req.url.slice("/todos/".length);
      try {
        todoStore.delete(id);
        res.writeHead(204);
        res.end();
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
