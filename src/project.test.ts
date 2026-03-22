import { describe, it, expect } from "vitest";
import { ProjectStore } from "./project.js";
import { TodoStore } from "./todo.js";

describe("ProjectStore", () => {
  describe("list", () => {
    it("returns Inbox when no projects have been added", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      const projects = projectStore.list();

      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Inbox");
      expect(projects[0].id).toBe(projectStore.getInboxId());
    });

    it("returns all projects including Inbox", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const work = projectStore.add("Work");
      const personal = projectStore.add("Personal");

      const projects = projectStore.list();

      expect(projects).toHaveLength(3);
      const names = projects.map((p) => p.name);
      expect(names).toContain("Inbox");
      expect(names).toContain("Work");
      expect(names).toContain("Personal");
    });

    it("does not include deleted projects", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const work = projectStore.add("Work");
      projectStore.add("Personal");

      projectStore.delete(work.id);

      const projects = projectStore.list();
      expect(projects).toHaveLength(2);
      const names = projects.map((p) => p.name);
      expect(names).not.toContain("Work");
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
