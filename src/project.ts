import { TodoStore } from "./todo.js";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export interface DeleteResult {
  deleted: boolean;
  todosRelocated: number;
}

export class ProjectStore {
  private projects: Map<string, Project> = new Map();
  private inboxId: string;

  constructor(private todoStore: TodoStore) {
    const inbox = this.createProject("Inbox");
    this.inboxId = inbox.id;
  }

  private createProject(name: string): Project {
    const id = crypto.randomUUID();
    const project: Project = {
      id,
      name,
      createdAt: new Date().toISOString(),
    };
    this.projects.set(id, project);
    return project;
  }

  add(name: string): Project {
    return this.createProject(name);
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  list(): Project[] {
    return Array.from(this.projects.values());
  }

  getInboxId(): string {
    return this.inboxId;
  }

  delete(id: string): DeleteResult {
    if (id === this.inboxId) {
      throw new Error("Cannot delete the Inbox project");
    }

    const project = this.projects.get(id);
    if (!project) {
      throw new Error("Project not found");
    }

    const todos = this.todoStore.listByProject(id);
    for (const todo of todos) {
      todo.projectId = this.inboxId;
    }

    this.projects.delete(id);

    return { deleted: true, todosRelocated: todos.length };
  }
}
