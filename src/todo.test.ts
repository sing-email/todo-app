import { describe, it, expect } from "vitest";
import { TodoStore } from "./todo.js";

describe("TodoStore", () => {
  it("adds a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Buy milk");
    expect(todo.title).toBe("Buy milk");
    expect(todo.completed).toBe(false);
  });

  it("sets createdAt to an ISO 8601 string on new todos", () => {
    const before = new Date().toISOString();
    const store = new TodoStore();
    const todo = store.add("Timestamped task");
    const after = new Date().toISOString();
    expect(todo.createdAt).toBeDefined();
    expect(todo.createdAt >= before).toBe(true);
    expect(todo.createdAt <= after).toBe(true);
  });

  it("lists todos", () => {
    const store = new TodoStore();
    store.add("A");
    store.add("B");
    expect(store.list()).toHaveLength(2);
  });

  it("completes a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Test");
    const result = store.complete(todo.id);
    expect(result.completed).toBe(true);
    expect(store.get(todo.id)?.completed).toBe(true);
  });

  it("complete() throws when the todo ID does not exist", () => {
    const store = new TodoStore();
    expect(() => store.complete("unknown-id")).toThrowError("Todo not found");
  });

  it("deletes a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Delete me");
    store.delete(todo.id);
    expect(store.get(todo.id)).toBeUndefined();
  });

  it("delete() throws when the todo ID does not exist", () => {
    const store = new TodoStore();
    expect(() => store.delete("unknown-id")).toThrowError("Todo not found");
  });

  it("add() trims whitespace from title before storing", () => {
    const store = new TodoStore();
    const todo = store.add("  Buy milk  ");
    expect(todo.title).toBe("Buy milk");
  });

  it("add() throws when title is empty after trimming", () => {
    const store = new TodoStore();
    expect(() => store.add("   ")).toThrowError(
      "Todo title must be a non-empty string",
    );
  });

  it("add() throws when title is empty string", () => {
    const store = new TodoStore();
    expect(() => store.add("")).toThrowError(
      "Todo title must be a non-empty string",
    );
  });

  it("add() does not accept a projectId parameter", () => {
    const store = new TodoStore();
    const todo = store.add("Inbox task");
    expect(todo.projectId).toBeUndefined();
  });

  it("listByProject() returns only todos matching the given projectId", () => {
    const store = new TodoStore();
    const todoA = store.add("Task A");
    store.assignToProject(todoA.id, "proj-1");
    const todoB = store.add("Task B");
    store.assignToProject(todoB.id, "proj-2");
    const todoC = store.add("Task C");
    store.assignToProject(todoC.id, "proj-1");
    const result = store.listByProject("proj-1");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.title).sort()).toEqual(["Task A", "Task C"]);
  });

  it("listByProject() returns empty array when no todos match", () => {
    const store = new TodoStore();
    const todo = store.add("Task A");
    store.assignToProject(todo.id, "proj-1");
    expect(store.listByProject("proj-999")).toEqual([]);
  });

  describe("updateTitle", () => {
    it("updates the title of an existing todo", () => {
      const store = new TodoStore();
      const todo = store.add("Old title");
      const result = store.updateTitle(todo.id, "New title");
      expect(result.title).toBe("New title");
      expect(store.get(todo.id)?.title).toBe("New title");
    });

    it("trims whitespace from the new title", () => {
      const store = new TodoStore();
      const todo = store.add("Old title");
      const result = store.updateTitle(todo.id, "  New title  ");
      expect(result.title).toBe("New title");
    });

    it("throws when the todo ID does not exist", () => {
      const store = new TodoStore();
      expect(() => store.updateTitle("unknown-id", "New title")).toThrowError(
        "Todo not found",
      );
    });

    it("throws when title is empty after trimming", () => {
      const store = new TodoStore();
      const todo = store.add("Old title");
      expect(() => store.updateTitle(todo.id, "   ")).toThrowError(
        "Todo title must be a non-empty string",
      );
    });

    it("throws when title is empty string", () => {
      const store = new TodoStore();
      const todo = store.add("Old title");
      expect(() => store.updateTitle(todo.id, "")).toThrowError(
        "Todo title must be a non-empty string",
      );
    });
  });

  describe("assignToProject", () => {
    it("sets the projectId on an existing todo", () => {
      const store = new TodoStore();
      const todo = store.add("Task A");
      const result = store.assignToProject(todo.id, "proj-1");
      expect(result.projectId).toBe("proj-1");
      expect(store.get(todo.id)?.projectId).toBe("proj-1");
    });

    it("throws when the todoId does not exist", () => {
      const store = new TodoStore();
      expect(() => store.assignToProject("unknown-id", "proj-1")).toThrowError(
        "Todo not found",
      );
    });
  });
});
