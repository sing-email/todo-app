import { describe, it, expect } from "vitest";
import { TodoStore } from "./todo.js";
import { ProjectStore } from "./project.js";

describe("ProjectStore", () => {
  it("creates an Inbox project on construction", () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    const inboxId = projectStore.getInboxId();
    expect(projectStore.has(inboxId)).toBe(true);
    expect(projectStore.get(inboxId)?.name).toBe("Inbox");
  });

  it("adds a project", () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    const project = projectStore.add("Work");
    expect(project.name).toBe("Work");
    expect(projectStore.has(project.id)).toBe(true);
  });

  it("returns undefined for non-existent project", () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    expect(projectStore.get("non-existent")).toBeUndefined();
    expect(projectStore.has("non-existent")).toBe(false);
  });
});

describe("moveToProject with project validation", () => {
  it("moves a todo to an existing project", () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    const project = projectStore.add("Work");
    const todo = todoStore.add("Task 1");

    const updated = todoStore.moveToProject(todo.id, project.id, projectStore);
    expect(updated.projectId).toBe(project.id);
  });

  it("throws when project does not exist", () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    const todo = todoStore.add("Task 1");

    expect(() =>
      todoStore.moveToProject(todo.id, "non-existent", projectStore)
    ).toThrow("Project not found: non-existent");
  });

  it("throws when todo does not exist", () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    const project = projectStore.add("Work");

    expect(() =>
      todoStore.moveToProject("non-existent", project.id, projectStore)
    ).toThrow("Todo not found: non-existent");
  });

  it("moves a todo to the Inbox project", () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    const todo = todoStore.add("Task 1");
    const inboxId = projectStore.getInboxId();

    const updated = todoStore.moveToProject(todo.id, inboxId, projectStore);
    expect(updated.projectId).toBe(inboxId);
  });

  it("re-assigns a todo from one project to another", () => {
    const todoStore = new TodoStore();
    const projectStore = new ProjectStore(todoStore);
    const project1 = projectStore.add("Work");
    const project2 = projectStore.add("Personal");
    const todo = todoStore.add("Task 1");

    todoStore.moveToProject(todo.id, project1.id, projectStore);
    expect(todoStore.get(todo.id)?.projectId).toBe(project1.id);

    todoStore.moveToProject(todo.id, project2.id, projectStore);
    expect(todoStore.get(todo.id)?.projectId).toBe(project2.id);
  });
});
