import { describe, it, expect } from "vitest";
import { ProjectStore } from "./project.js";
import { TodoStore } from "./todo.js";

describe("ProjectStore", () => {
  describe("list()", () => {
    it("includes Inbox when no other projects exist", () => {
      const store = new ProjectStore(new TodoStore());
      const projects = store.list();
      expect(projects).toHaveLength(1);
      expect(projects[0].name).toBe("Inbox");
      expect(projects[0].id).toBeDefined();
      expect(projects[0].createdAt).toBeDefined();
    });

    it("includes Inbox and additional projects", () => {
      const store = new ProjectStore(new TodoStore());
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
      const store = new ProjectStore(new TodoStore());
      store.add("Alpha");
      store.add("Beta");
      const projects = store.list();
      expect(projects[0].name).toBe("Inbox");
    });

    it("returns projects with id, name, and createdAt", () => {
      const store = new ProjectStore(new TodoStore());
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
      const store = new ProjectStore(new TodoStore());
      const list1 = store.list();
      const list2 = store.list();
      expect(list1).not.toBe(list2);
      expect(list1).toEqual(list2);
    });
  });

  describe("reassignTodoProject()", () => {
    it("moves a todo to an existing project", () => {
      const todoStore = new TodoStore();
      const store = new ProjectStore(todoStore);
      const project = store.add("Work");
      const todo = todoStore.add("Write tests");

      const result = store.reassignTodoProject(todo.id, project.id);
      expect(result.projectId).toBe(project.id);
      expect(todoStore.get(todo.id)?.projectId).toBe(project.id);
    });

    it("throws when the target project does not exist", () => {
      const todoStore = new TodoStore();
      const store = new ProjectStore(todoStore);
      const todo = todoStore.add("Write tests");

      expect(() =>
        store.reassignTodoProject(todo.id, "nonexistent-id"),
      ).toThrow("Project not found: nonexistent-id");
    });

    it("throws when the todo does not exist", () => {
      const todoStore = new TodoStore();
      const store = new ProjectStore(todoStore);
      const project = store.add("Work");

      expect(() =>
        store.reassignTodoProject("nonexistent-id", project.id),
      ).toThrow("Todo not found: nonexistent-id");
    });

    it("moves a todo between projects", () => {
      const todoStore = new TodoStore();
      const store = new ProjectStore(todoStore);
      const project1 = store.add("Work");
      const project2 = store.add("Personal");
      const todo = todoStore.add("Flexible task");

      store.reassignTodoProject(todo.id, project1.id);
      expect(todoStore.get(todo.id)?.projectId).toBe(project1.id);

      store.reassignTodoProject(todo.id, project2.id);
      expect(todoStore.get(todo.id)?.projectId).toBe(project2.id);
    });

    it("can move a todo to the Inbox project", () => {
      const todoStore = new TodoStore();
      const store = new ProjectStore(todoStore);
      const project = store.add("Work");
      const todo = todoStore.add("Task");

      store.reassignTodoProject(todo.id, project.id);
      store.reassignTodoProject(todo.id, store.getInboxId());
      expect(todoStore.get(todo.id)?.projectId).toBe(store.getInboxId());
    });
  });
});

describe("TodoStore.moveToProject", () => {
  it("sets projectId on a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Test");
    const result = store.moveToProject(todo.id, "some-project");
    expect(result?.projectId).toBe("some-project");
  });

  it("returns undefined for nonexistent todo", () => {
    const store = new TodoStore();
    expect(store.moveToProject("bad-id", "proj")).toBeUndefined();
  });
});

describe("TodoStore.listByProject", () => {
  it("returns todos for a given project", () => {
    const store = new TodoStore();
    const t1 = store.add("A");
    const t2 = store.add("B");
    store.add("C");
    store.moveToProject(t1.id, "proj-1");
    store.moveToProject(t2.id, "proj-1");
    expect(store.listByProject("proj-1")).toHaveLength(2);
  });

  it("returns empty array when no todos in project", () => {
    const store = new TodoStore();
    store.add("A");
    expect(store.listByProject("proj-1")).toHaveLength(0);
  });
});
