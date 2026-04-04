export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  projectId?: string;
  tags: string[];
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
      tags: [],
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

  listPaginated(limit: number, cursor?: string): { items: Todo[]; cursor: string | null; hasMore: boolean; total: number } {
    const all = Array.from(this.todos.values());
    const total = all.length;

    let offset = 0;
    if (cursor !== undefined) {
      const decoded = Buffer.from(cursor, "base64url").toString("utf-8");
      const parsed = Number(decoded);
      if (!Number.isInteger(parsed) || parsed < 0) {
        throw new Error("Invalid cursor");
      }
      offset = parsed;
    }

    const items = all.slice(offset, offset + limit);
    const nextOffset = offset + limit;
    const hasMore = nextOffset < total;

    return {
      items,
      cursor: hasMore ? Buffer.from(String(nextOffset)).toString("base64url") : null,
      hasMore,
      total,
    };
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

  addTag(id: string, tag: string): Todo {
    const todo = this.todos.get(id);
    if (!todo) {
      throw new Error("Todo not found");
    }
    if (todo.tags.includes(tag)) {
      throw new Error("Tag already exists");
    }
    todo.tags.push(tag);
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
