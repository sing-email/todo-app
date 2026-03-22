import { describe, it, expect } from "vitest";
import { ProjectStore } from "./project.js";

describe("ProjectStore", () => {
  describe("list()", () => {
    it("includes Inbox when no other projects exist", () => {
      const store = new ProjectStore();
      const projects = store.list();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Inbox");
      expect(projects[0].id).toBeDefined();
      expect(projects[0].createdAt).toBeDefined();
    });

    it("includes Inbox and additional projects", () => {
      const store = new ProjectStore();
      store.add("Work");
      store.add("Personal");
      const projects = store.list();
      expect(projects).toHaveLength(3);
      expect(projects.map((p) => p.name)).toEqual([
        "Inbox",
        "Work",
        "Personal",
      ]);
    });

    it("always returns Inbox first", () => {
      const store = new ProjectStore();
      store.add("Alpha");
      store.add("Beta");
      const projects = store.list();
      expect(projects[0].name).toBe("Inbox");
    });

    it("returns projects with id, name, and createdAt", () => {
      const store = new ProjectStore();
      store.add("Work");
      const projects = store.list();
      for (const project of projects) {
        expect(project).toHaveProperty("id");
        expect(project).toHaveProperty("name");
        expect(project).toHaveProperty("createdAt");
        expect(typeof project.id).toBe("string");
        expect(typeof project.name).toBe("string");
        expect(typeof project.createdAt).toBe("string");
      }
    });

    it("returns a new array on each call", () => {
      const store = new ProjectStore();
      const list1 = store.list();
      const list2 = store.list();
      expect(list1).not.toBe(list2);
      expect(list1).toEqual(list2);
    });
  });
});
