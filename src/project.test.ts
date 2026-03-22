import { describe, it, expect } from "vitest";
import { ProjectStore } from "./project.js";
import { TodoStore } from "./todo.js";

describe("ProjectStore", () => {
  function createStore() {
    const todoStore = new TodoStore();
    return new ProjectStore(todoStore);
  }

  describe("add", () => {
    it("creates a project with the given name", () => {
      const store = createStore();
      const project = store.add("Work");
      expect(project.name).toBe("Work");
      expect(project.id).toBeDefined();
      expect(project.createdAt).toBeDefined();
    });

    it("assigns unique ids to each project", () => {
      const store = createStore();
      const a = store.add("A");
      const b = store.add("B");
      expect(a.id).not.toBe(b.id);
    });
  });

  describe("get", () => {
    it("returns a project by id", () => {
      const store = createStore();
      const project = store.add("Work");
      expect(store.get(project.id)).toEqual(project);
    });

    it("returns undefined for a non-existent id", () => {
      const store = createStore();
      expect(store.get("no-such-id")).toBeUndefined();
    });
  });

  describe("has", () => {
    it("returns true when the project exists", () => {
      const store = createStore();
      const project = store.add("Work");
      expect(store.has(project.id)).toBe(true);
    });

    it("returns false when the project does not exist", () => {
      const store = createStore();
      expect(store.has("no-such-id")).toBe(false);
    });

    it("returns true for the Inbox project", () => {
      const store = createStore();
      expect(store.has(store.getInboxId())).toBe(true);
    });
  });
});
