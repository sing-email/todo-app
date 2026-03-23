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

      const todo1 = todoStore.add("Task A", project.id);
      const todo2 = todoStore.add("Task B", project.id);

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
});
