import http from "node:http";
import { TodoStore } from "./todo.js";

export function createApp(todoStore: TodoStore): http.Server {
  return http.createServer((req, res) => {
    console.log(`${req.method} ${req.url}`);

    const { pathname } = new URL(req.url ?? "/", "http://localhost");

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

    const todoSegments = pathname.match(/^\/todos\/([^/]+)$/);
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
