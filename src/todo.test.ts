import { describe, it, expect } from "vitest";
import { TodoStore } from "./todo.js";

describe("TodoStore", () => {
  it("adds a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Buy milk");
    expect(todo.title).toBe("Buy milk");
    expect(todo.completed).toBe(false);
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
    store.complete(todo.id);
    expect(store.get(todo.id)?.completed).toBe(true);
  });

  it("deletes a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Delete me");
    expect(store.delete(todo.id)).toBe(true);
    expect(store.get(todo.id)).toBeUndefined();
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
