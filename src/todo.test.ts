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

  describe("projectId field", () => {
    it("defaults to undefined when not provided", () => {
      const store = new TodoStore();
      const todo = store.add("No project");
      expect(todo.projectId).toBeUndefined();
    });

    it("sets projectId when provided to add()", () => {
      const store = new TodoStore();
      const todo = store.add("With project", "proj-1");
      expect(todo.projectId).toBe("proj-1");
    });
  });

  describe("listByProject", () => {
    it("returns only todos matching the given projectId", () => {
      const store = new TodoStore();
      store.add("Task A", "proj-1");
      store.add("Task B", "proj-2");
      store.add("Task C", "proj-1");

      const results = store.listByProject("proj-1");
      expect(results).toHaveLength(2);
      expect(results.map((t) => t.title).sort()).toEqual(["Task A", "Task C"]);
    });

    it("returns empty array when no todos match", () => {
      const store = new TodoStore();
      store.add("Task A", "proj-1");
      expect(store.listByProject("nonexistent")).toEqual([]);
    });

    it("returns empty array on empty store", () => {
      const store = new TodoStore();
      expect(store.listByProject("proj-1")).toEqual([]);
    });

    it("does not return todos without a projectId", () => {
      const store = new TodoStore();
      store.add("No project");
      store.add("Has project", "proj-1");

      const results = store.listByProject("proj-1");
      expect(results).toHaveLength(1);
      expect(results[0].title).toBe("Has project");
    });
  });

  describe("updateProjectId", () => {
    it("updates the projectId of an existing todo", () => {
      const store = new TodoStore();
      const todo = store.add("Task", "proj-1");
      const updated = store.updateProjectId(todo.id, "proj-2");
      expect(updated?.projectId).toBe("proj-2");
      expect(store.get(todo.id)?.projectId).toBe("proj-2");
    });

    it("clears projectId when set to undefined", () => {
      const store = new TodoStore();
      const todo = store.add("Task", "proj-1");
      store.updateProjectId(todo.id, undefined);
      expect(store.get(todo.id)?.projectId).toBeUndefined();
    });

    it("returns undefined for nonexistent todo", () => {
      const store = new TodoStore();
      expect(store.updateProjectId("bad-id", "proj-1")).toBeUndefined();
    });
  });
});
