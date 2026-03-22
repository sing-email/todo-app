import { describe, it, expect } from "vitest";
import { TodoStore, INBOX_PROJECT_ID } from "./todo.js";
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

  describe("listByProject", () => {
    it("returns correct subset of todos for a project", () => {
      const projects = new ProjectStore();
      const project = projects.add("Work");
      const store = new TodoStore(projects);

      const workTodo = store.add("Write report", project.id);
      store.add("Buy milk"); // Inbox todo

      const result = store.listByProject(project.id);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(workTodo.id);
      expect(result[0].projectId).toBe(project.id);
    });

    it("returns Inbox todos when filtering by Inbox project", () => {
      const projects = new ProjectStore();
      const project = projects.add("Work");
      const store = new TodoStore(projects);

      const inboxTodo = store.add("Unassigned task");
      store.add("Work task", project.id);

      const result = store.listByProject(INBOX_PROJECT_ID);
      expect(result).toHaveLength(1);
      expect(result[0].id).toBe(inboxTodo.id);
      expect(result[0].projectId).toBe(INBOX_PROJECT_ID);
    });

    it("returns empty list for a project with no todos", () => {
      const projects = new ProjectStore();
      const project = projects.add("Empty project");
      const store = new TodoStore(projects);

      store.add("Inbox task");

      const result = store.listByProject(project.id);
      expect(result).toHaveLength(0);
    });

    it("throws error when filtering by non-existent project", () => {
      const projects = new ProjectStore();
      const store = new TodoStore(projects);

      expect(() => store.listByProject("non-existent-id")).toThrow(
        "Project not found"
      );
    });

    it("list() still returns all todos regardless of project", () => {
      const projects = new ProjectStore();
      const project = projects.add("Work");
      const store = new TodoStore(projects);

      store.add("Inbox task");
      store.add("Work task", project.id);

      expect(store.list()).toHaveLength(2);
    });
  });
});
