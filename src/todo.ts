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
    title = title.trim();
    if (!title) {
      throw new Error("Todo title must be a non-empty string");
    }
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

  listByProject(projectId: string): Todo[] {
    return Array.from(this.todos.values()).filter(
      (t) => t.projectId === projectId,
    );
  }

  get(id: string): Todo | undefined {
    return this.todos.get(id);
  }

  list(): Todo[] {
    return Array.from(this.todos.values());
  }

  complete(id: string): Todo {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new Error("Todo not found");
    }
    todo.completed = true;
    return todo;
  }

  setCompleted(id: string, completed: boolean): Todo {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new Error("Todo not found");
    }
    todo.completed = completed;
    return todo;
  }

  assignToProject(todoId: string, projectId: string): Todo {
    const todo = this.todos.get(todoId);
    if (!todo) {
      throw new Error("Todo not found");
    }
    todo.projectId = projectId;
    return todo;
  }

  updateTitle(id: string, title: string): Todo {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new Error("Todo not found");
    }
    title = title.trim();
    if (!title) {
      throw new Error("Todo title must be a non-empty string");
    }
    todo.title = title;
    return todo;
  }

  delete(id: string): void {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new Error("Todo not found");
    }
    this.todos.delete(id);
  }
}
