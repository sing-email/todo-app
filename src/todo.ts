export interface Todo {
  id: string;
  title: string;
  completed: boolean;
  createdAt: string;
  projectId?: string;
  tags: string[];
}

export interface PaginatedResult<T> {
  items: T[];
  pagination: {
    cursor: string | null;
    hasMore: boolean;
    total: number;
  };
}

function encodeCursor(offset: number): string {
  return Buffer.from(`offset:${offset}`).toString("base64url");
}

export function decodeCursor(cursor: string): number {
  let decoded: string;
  try {
    decoded = Buffer.from(cursor, "base64url").toString();
  } catch {
    throw new Error("Invalid cursor");
  }
  const match = decoded.match(/^offset:(\d+)$/);
  if (!match) {
    throw new Error("Invalid cursor");
  }
  return parseInt(match[1], 10);
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

  listPaginated(limit: number = 20, cursor?: string): PaginatedResult<Todo> {
    const all = Array.from(this.todos.values());
    const total = all.length;
    const offset = cursor ? decodeCursor(cursor) : 0;
    const items = all.slice(offset, offset + limit);
    const nextOffset = offset + items.length;
    const hasMore = nextOffset < total;
    return {
      items,
      pagination: {
        cursor: hasMore ? encodeCursor(nextOffset) : null,
        hasMore,
        total,
      },
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
