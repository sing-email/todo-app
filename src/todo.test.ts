import { describe, it, expect } from "vitest";
import { TodoStore } from "./todo.js";

describe("TodoStore", () => {
  it("adds a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Buy milk");
    expect(todo.title).toBe("Buy milk");
    expect(todo.completed).toBe(false);
  });

  it("lists todos", () => {
    const store = new TodoStore();
    store.add("A");
    store.add("B");
    expect(store.list()).toHaveLength(2);
  });

  it("completes a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Test");
    store.complete(todo.id);
    expect(store.get(todo.id)?.completed).toBe(true);
  });

  it("deletes a todo", () => {
    const store = new TodoStore();
    const todo = store.add("Delete me");
    expect(store.delete(todo.id)).toBe(true);
    expect(store.get(todo.id)).toBeUndefined();
  });
});
