import type { Todo } from "./todo.js";
import { TodoStore } from "./todo.js";

export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export class ProjectStore {
  private projects: Map<string, Project> = new Map();
  private inboxId: string;
  private todoStore: TodoStore;

  constructor(todoStore: TodoStore) {
    this.todoStore = todoStore;
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

  getInboxId(): string {
    return this.inboxId;
  }

  list(): Project[] {
    const inbox = this.projects.get(this.inboxId)!;
    const rest = Array.from(this.projects.values()).filter(
      (p) => p.id !== this.inboxId,
    );
    return [inbox, ...rest];
  }

  reassignTodoProject(todoId: string, projectId: string): Todo {
    const project = this.projects.get(projectId);
    if (!project) {
      throw new Error(`Project not found: ${projectId}`);
    }
    const todo = this.todoStore.moveToProject(todoId, projectId);
    if (!todo) {
      throw new Error(`Todo not found: ${todoId}`);
    }
    return todo;
  }
}
