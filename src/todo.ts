import type { ProjectStore } from "./project.js";

export const INBOX_PROJECT_ID = "inbox";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  projectId: string;
}

export class TodoStore {
  private todos: Map<string, Todo> = new Map();
  private projects?: ProjectStore;

  constructor(projects?: ProjectStore) {
    this.projects = projects;
  }

  add(title: string, projectId: string = INBOX_PROJECT_ID): Todo {
    const id = crypto.randomUUID();
    const todo: Todo = {
      id,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      projectId,
    };
    this.todos.set(id, todo);
    return todo;
  }

  get(id: string): Todo | undefined {
    return this.todos.get(id);
  }

  list(): Todo[] {
    return Array.from(this.todos.values());
  }

  listByProject(projectId: string): Todo[] {
    if (projectId !== INBOX_PROJECT_ID && !this.projects?.has(projectId)) {
      throw new Error("Project not found");
    }
    return this.list().filter((todo) => todo.projectId === projectId);
  }

  complete(id: string): Todo | undefined {
    const todo = this.todos.get(id);
    if (todo) {
      todo.completed = true;
    }
    return todo;
  }

  delete(id: string): boolean {
    return this.todos.delete(id);
  }
}
