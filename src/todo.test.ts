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

  describe("listByProject", () => {
    it("filters todos by projectId", () => {
      const store = new TodoStore();
      const todo1 = store.add("Task A");
      const todo2 = store.add("Task B");
      const todo3 = store.add("Task C");
      store.updateProjectId(todo1.id, "proj-1");
      store.updateProjectId(todo2.id, "proj-2");
      store.updateProjectId(todo3.id, "proj-1");

      const result = store.listByProject("proj-1");
      expect(result).toHaveLength(2);
      expect(result.map((t) => t.id)).toContain(todo1.id);
      expect(result.map((t) => t.id)).toContain(todo3.id);
    });

    it("returns empty array for unknown projectId", () => {
      const store = new TodoStore();
      store.add("Task A");
      expect(store.listByProject("nonexistent")).toEqual([]);
    });
  });

  describe("updateProjectId", () => {
    it("updates projectId on an existing todo", () => {
      const store = new TodoStore();
      const todo = store.add("Task A");
      const updated = store.updateProjectId(todo.id, "proj-1");
      expect(updated).toBeDefined();
      expect(updated!.projectId).toBe("proj-1");
      expect(store.get(todo.id)!.projectId).toBe("proj-1");
    });

    it("returns undefined for unknown id", () => {
      const store = new TodoStore();
      const result = store.updateProjectId("unknown-id", "proj-1");
      expect(result).toBeUndefined();
    });
  });
});
