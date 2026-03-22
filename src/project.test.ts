import { describe, it, expect } from "vitest";
import { ProjectStore } from "./project.js";
import { TodoStore } from "./todo.js";

describe("ProjectStore", () => {
  describe("update", () => {
    it("renames a project and returns the updated project", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const project = projectStore.add("Work");

      const updated = projectStore.update(project.id, "Office");

      expect(updated.id).toBe(project.id);
      expect(updated.name).toBe("Office");
      expect(projectStore.get(project.id)?.name).toBe("Office");
    });

    it("throws when renaming the Inbox project", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const inboxId = projectStore.getInboxId();

      expect(() => projectStore.update(inboxId, "My Inbox")).toThrowError(
        "Cannot rename the Inbox project",
      );
    });

    it("throws when renaming to a duplicate name (case-insensitive)", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      projectStore.add("Work");
      const personal = projectStore.add("Personal");

      expect(() => projectStore.update(personal.id, "work")).toThrowError(
        "A project with this name already exists",
      );
    });

    it("throws when renaming to an empty name", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const project = projectStore.add("Work");

      expect(() => projectStore.update(project.id, "")).toThrowError(
        "Project name cannot be empty",
      );
    });

    it("throws when renaming to a whitespace-only name", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const project = projectStore.add("Work");

      expect(() => projectStore.update(project.id, "   ")).toThrowError(
        "Project name cannot be empty",
      );
    });

    it("throws when updating a non-existent project", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      expect(() => projectStore.update("non-existent-id", "Foo")).toThrowError(
        "Project not found",
      );
    });

    it("allows renaming to the same name with different casing", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);
      const project = projectStore.add("work");

      const updated = projectStore.update(project.id, "Work");

      expect(updated.name).toBe("Work");
    });
  });
});
