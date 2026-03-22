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
      projectStore.add("Work");
      projectStore.add("Personal");

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

    it("returns a new array (not a reference to internal state)", () => {
      const todoStore = new TodoStore();
      const projectStore = new ProjectStore(todoStore);

      const list1 = projectStore.list();
      const list2 = projectStore.list();

      expect(list1).not.toBe(list2);
      expect(list1).toEqual(list2);
    });
  });
});
