export interface Project {
  id: string;
  name: string;
  createdAt: string;
}

export class ProjectStore {
  private projects: Map<string, Project> = new Map();
  private inboxId: string;

  constructor() {
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

  has(id: string): boolean {
    return this.projects.has(id);
  }

  getInboxId(): string {
    return this.inboxId;
  }
}
