export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  projectId?: string;
}

export class TodoStore {
  private todos: Map<string, Todo> = new Map();

  add(title: string): Todo {
    const id = crypto.randomUUID();
    const todo: Todo = {
      id,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
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

  listByProject(projectId: string): Todo[] {
    return Array.from(this.todos.values()).filter(
      (todo) => todo.projectId === projectId,
    );
  }

  updateProjectId(id: string, projectId: string): Todo | undefined {
    const todo = this.todos.get(id);
    if (todo) {
      todo.projectId = projectId;
    }
    return todo;
  }
}
