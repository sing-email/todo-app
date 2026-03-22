export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
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

  complete(id: string): Todo {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new Error(`Todo not found: ${id}`);
    }
    todo.completed = true;
    return todo;
  }

  delete(id: string): void {
    if (!this.todos.has(id)) {
      throw new Error(`Todo not found: ${id}`);
    }
    this.todos.delete(id);
  }
}
