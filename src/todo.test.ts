import { describe, it, expect } from "vitest";
import { TodoStore } from "./todo.js";
import { ProjectStore } from "./project.js";

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
      const projectStore = new ProjectStore();
      const projectA = projectStore.add("Project A");
      const projectB = projectStore.add("Project B");
      const store = new TodoStore(projectStore);
      const todo = store.add("My task", projectA.id);

      const updated = store.moveToProject(todo.id, projectB.id);

      expect(updated.projectId).toBe(projectB.id);
      expect(store.get(todo.id)?.projectId).toBe(projectB.id);
    });

    it("throws when moving to a non-existent project", () => {
      const projectStore = new ProjectStore();
      const project = projectStore.add("Real Project");
      const store = new TodoStore(projectStore);
      const todo = store.add("My task", project.id);

      expect(() => store.moveToProject(todo.id, "fake-id")).toThrow(
        "Project not found: fake-id",
      );
    });

    it("is a no-op when moving to the same project", () => {
      const projectStore = new ProjectStore();
      const project = projectStore.add("Project A");
      const store = new TodoStore(projectStore);
      const todo = store.add("My task", project.id);

      const updated = store.moveToProject(todo.id, project.id);

      expect(updated.projectId).toBe(project.id);
      expect(updated.id).toBe(todo.id);
    });
  });
});
