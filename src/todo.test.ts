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

  it("add() with projectId sets the field correctly", () => {
    const store = new TodoStore();
    const todo = store.add("Project task", "proj-1");
    expect(todo.projectId).toBe("proj-1");
  });

  it("add() without projectId leaves it undefined", () => {
    const store = new TodoStore();
    const todo = store.add("Inbox task");
    expect(todo.projectId).toBeUndefined();
  });

  it("listByProject() returns only todos matching the given projectId", () => {
    const store = new TodoStore();
    store.add("Task A", "proj-1");
    store.add("Task B", "proj-2");
    store.add("Task C", "proj-1");
    const result = store.listByProject("proj-1");
    expect(result).toHaveLength(2);
    expect(result.map((t) => t.title).sort()).toEqual(["Task A", "Task C"]);
  });

  it("listByProject() returns empty array when no todos match", () => {
    const store = new TodoStore();
    store.add("Task A", "proj-1");
    expect(store.listByProject("proj-999")).toEqual([]);
  });
});
