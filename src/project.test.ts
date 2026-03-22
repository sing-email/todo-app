import { describe, it, expect } from "vitest";
import { ProjectStore } from "./project.js";

describe("ProjectStore", () => {
  it("creates an Inbox project on construction", () => {
    const projectStore = new ProjectStore();
    const inboxId = projectStore.getInboxId();
    expect(projectStore.has(inboxId)).toBe(true);
    expect(projectStore.get(inboxId)?.name).toBe("Inbox");
  });

  it("adds a project", () => {
    const projectStore = new ProjectStore();
    const project = projectStore.add("Work");
    expect(project.name).toBe("Work");
    expect(projectStore.has(project.id)).toBe(true);
  });

  it("returns undefined for non-existent project", () => {
    const projectStore = new ProjectStore();
    expect(projectStore.get("non-existent")).toBeUndefined();
    expect(projectStore.has("non-existent")).toBe(false);
  });
});
