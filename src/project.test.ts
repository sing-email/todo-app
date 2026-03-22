import { describe, it, expect } from "vitest";
import { ProjectStore } from "./project.js";

describe("ProjectStore", () => {
  describe("list()", () => {
    it("returns empty array when no projects exist", () => {
      const store = new ProjectStore();
      expect(store.list()).toEqual([]);
    });

    it("returns all added projects", () => {
      const store = new ProjectStore();
      const p1 = store.add("Work");
      const p2 = store.add("Personal");
      const projects = store.list();
      expect(projects).toHaveLength(2);
      expect(projects).toContainEqual(p1);
      expect(projects).toContainEqual(p2);
    });

    it("returns a new array (not internal reference)", () => {
      const store = new ProjectStore();
      store.add("Work");
      const list1 = store.list();
      const list2 = store.list();
      expect(list1).toEqual(list2);
      expect(list1).not.toBe(list2);
    });

    it("reflects additions after previous list() call", () => {
      const store = new ProjectStore();
      store.add("Work");
      expect(store.list()).toHaveLength(1);
      store.add("Personal");
      expect(store.list()).toHaveLength(2);
    });
  });

  describe("add()", () => {
    it("adds a project with a name", () => {
      const store = new ProjectStore();
      const project = store.add("Work");
      expect(project.name).toBe("Work");
      expect(project.id).toBeDefined();
    });
  });

  describe("get()", () => {
    it("retrieves a project by id", () => {
      const store = new ProjectStore();
      const project = store.add("Work");
      expect(store.get(project.id)).toEqual(project);
    });

    it("returns undefined for unknown id", () => {
      const store = new ProjectStore();
      expect(store.get("nonexistent")).toBeUndefined();
    });
  });

  describe("has()", () => {
    it("returns true for existing project", () => {
      const store = new ProjectStore();
      const project = store.add("Work");
      expect(store.has(project.id)).toBe(true);
    });

    it("returns false for unknown id", () => {
      const store = new ProjectStore();
      expect(store.has("nonexistent")).toBe(false);
    });
  });
});
