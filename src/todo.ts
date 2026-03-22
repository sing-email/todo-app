import { ProjectStore } from "./project.js";

export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  projectId?: string;
}

export class TodoStore {
  private todos: Map<string, Todo> = new Map();
  private projectStore?: ProjectStore;

  constructor(projectStore?: ProjectStore) {
    this.projectStore = projectStore;
  }

  add(title: string, projectId?: string): Todo {
    const id = crypto.randomUUID();
    const todo: Todo = {
      id,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      ...(projectId !== undefined && { projectId }),
    };
    this.todos.set(id, todo);
    return todo;
  }

  moveToProject(todoId: string, projectId: string): Todo {
    const todo = this.todos.get(todoId);
    if (!todo) {
      throw new Error(`Todo not found: ${todoId}`);
    }
    if (todo.projectId === projectId) {
      return todo;
    }
    if (!this.projectStore?.has(projectId)) {
      throw new Error(`Project not found: ${projectId}`);
    }
    todo.projectId = projectId;
    return todo;
  }

  get(id: string): Todo | undefined {
    return this.todos.get(id);
  }

  list(): Todo[] {
    return Array.from(this.todos.values());
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
