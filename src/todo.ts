export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  dueDate?: string;
}

export class TodoStore {
  private todos: Map<string, Todo> = new Map();

  add(title: string, dueDate?: string): Todo {
    const id = crypto.randomUUID();
    const todo: Todo = {
      id,
      title,
      completed: false,
      createdAt: new Date().toISOString(),
      dueDate,
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

  listOverdue(): Todo[] {
    const now = new Date().toISOString().slice(0, 10);
    return Array.from(this.todos.values()).filter(
      (todo) => !todo.completed && todo.dueDate !== undefined && todo.dueDate < now,
    );
  }

  delete(id: string): boolean {
    return this.todos.delete(id);
  }
}
