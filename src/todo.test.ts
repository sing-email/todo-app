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

  describe("moveToProject", () => {
    it("moves a todo to a project", () => {
      const store = new TodoStore();
      const todo = store.add("Buy milk");
      const moved = store.moveToProject(todo.id, "project-1");
      expect(moved.projectId).toBe("project-1");
      expect(store.get(todo.id)?.projectId).toBe("project-1");
    });

    it("re-assigns a todo to a different project", () => {
      const store = new TodoStore();
      const todo = store.add("Buy milk");
      store.moveToProject(todo.id, "project-1");
      const moved = store.moveToProject(todo.id, "project-2");
      expect(moved.projectId).toBe("project-2");
      expect(store.get(todo.id)?.projectId).toBe("project-2");
    });

    it("throws when moving a non-existent todo", () => {
      const store = new TodoStore();
      expect(() => store.moveToProject("no-such-id", "project-1")).toThrow(
        "Todo not found: no-such-id",
      );
    });

    it("throws when projectId is an empty string", () => {
      const store = new TodoStore();
      const todo = store.add("Buy milk");
      expect(() => store.moveToProject(todo.id, "")).toThrow();
    });
  });
});
