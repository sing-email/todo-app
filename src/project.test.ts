import { describe, it, expect } from "vitest";
import { ProjectStore } from "./project.js";
import { TodoStore } from "./todo.js";

describe("ProjectStore", () => {
  describe("createTodo", () => {
    it("creates a todo with an explicit projectId", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const project = projectStore.add("Work");

      const todo = projectStore.createTodo("Task A", project.id);

      expect(todo.title).toBe("Task A");
      expect(todo.projectId).toBe(project.id);
      expect(todo.completed).toBe(false);
      expect(todoStore.get(todo.id)).toBeDefined();
    });

    it("defaults to Inbox when no projectId is provided", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      const todo = projectStore.createTodo("Inbox task");

      expect(todo.projectId).toBe(projectStore.getInboxId());
      expect(todoStore.get(todo.id)?.projectId).toBe(
        projectStore.getInboxId(),
      );
    });

    it("throws when an invalid projectId is provided", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      expect(() =>
        projectStore.createTodo("Bad task", "non-existent-id"),
      ).toThrowError("Project not found");

      // No todo should have been created
      expect(todoStore.list()).toHaveLength(0);
    });
  });

  describe("deleteProject", () => {
    it("deletes a project and relocates its todos to Inbox", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const project = projectStore.add("Work");

      const todo1 = projectStore.createTodo("Task A", project.id);
      const todo2 = projectStore.createTodo("Task B", project.id);

      const result = projectStore.delete(project.id);

      expect(result.deleted).toBe(true);
      expect(result.todosRelocated).toBe(2);
      expect(projectStore.get(project.id)).toBeUndefined();

      // Todos should now belong to Inbox
      const inboxId = projectStore.getInboxId();
      expect(todoStore.get(todo1.id)?.projectId).toBe(inboxId);
      expect(todoStore.get(todo2.id)?.projectId).toBe(inboxId);
    });

    it("refuses to delete the Inbox project", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      const inboxId = projectStore.getInboxId();
      expect(() => projectStore.delete(inboxId)).toThrowError(
        "Cannot delete the Inbox project",
      );
    });

    it("deletes an empty project", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const project = projectStore.add("Empty");

      const result = projectStore.delete(project.id);

      expect(result.deleted).toBe(true);
      expect(result.todosRelocated).toBe(0);
      expect(projectStore.get(project.id)).toBeUndefined();
    });

    it("throws when deleting a non-existent project", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      expect(() => projectStore.delete("non-existent-id")).toThrowError(
        "Project not found",
      );
    });
  });

  describe("add", () => {
    it("creates a project with the given name and returns the full object", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      const project = projectStore.add("Work");

      expect(project.id).toBeDefined();
      expect(project.name).toBe("Work");
      expect(project.createdAt).toBeDefined();
      expect(projectStore.get(project.id)).toEqual(project);
    });

    it("rejects an empty name", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      expect(() => projectStore.add("")).toThrowError(
        "Project name must be a non-empty string",
      );
    });

    it("rejects a whitespace-only name", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      expect(() => projectStore.add("   ")).toThrowError(
        "Project name must be a non-empty string",
      );
    });

    it("rejects duplicate project names (case-insensitive)", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      projectStore.add("Work");

      expect(() => projectStore.add("work")).toThrowError(
        'Project name "work" already exists',
      );
      expect(() => projectStore.add("WORK")).toThrowError(
        'Project name "WORK" already exists',
      );
    });

    it("trims whitespace from name before storing", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      const project = projectStore.add("  Work  ");

      expect(project.name).toBe("Work");
    });

    it("detects duplicates against the trimmed name", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      projectStore.add("Work");

      expect(() => projectStore.add("  Work  ")).toThrowError(
        'Project name "Work" already exists',
      );
    });

    it("rejects creating a project named Inbox (case-insensitive)", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      expect(() => projectStore.add("Inbox")).toThrowError(
        'Project name "Inbox" already exists',
      );
      expect(() => projectStore.add("inbox")).toThrowError(
        'Project name "inbox" already exists',
      );
    });
  });

  describe("list", () => {
    it("returns Inbox when no other projects exist", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      const projects = projectStore.list();

      expect(projects).toHaveLength(1);
      expect(projects[0].id).toBe(projectStore.getInboxId());
      expect(projects[0].name).toBe("Inbox");
    });

    it("returns all projects including Inbox", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const work = projectStore.add("Work");
      const personal = projectStore.add("Personal");

      const projects = projectStore.list();

      expect(projects).toHaveLength(3);
      const ids = projects.map((p) => p.id);
      expect(ids).toContain(projectStore.getInboxId());
      expect(ids).toContain(work.id);
      expect(ids).toContain(personal.id);
    });

    it("always returns Inbox first", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      projectStore.add("Alpha");
      projectStore.add("Beta");

      const projects = projectStore.list();

      expect(projects[0].id).toBe(projectStore.getInboxId());
      expect(projects[0].name).toBe("Inbox");
    });

    it("returns a new array on each call", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      const first = projectStore.list();
      const second = projectStore.list();

      expect(first).not.toBe(second);
      expect(first).toEqual(second);
    });
  });
});
