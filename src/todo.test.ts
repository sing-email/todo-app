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
    it("moves a todo to a different project", () => {
      const store = new TodoStore();
      const todo = store.add("Task", "project-a");
      store.moveToProject(todo.id, "project-b");
      expect(store.get(todo.id)?.projectId).toBe("project-b");
    });

    it("returns the updated todo", () => {
      const store = new TodoStore();
      const todo = store.add("Task", "project-a");
      const result = store.moveToProject(todo.id, "project-b");
      expect(result?.id).toBe(todo.id);
      expect(result?.projectId).toBe("project-b");
    });

    it("returns undefined for non-existent todo", () => {
      const store = new TodoStore();
      const result = store.moveToProject("non-existent", "project-b");
      expect(result).toBeUndefined();
    });
  });
});
