export interface Project {
  id: string;
  name: string;
}

export class ProjectStore {
  private projects: Map<string, Project> = new Map();

  add(name: string): Project {
    const id = crypto.randomUUID();
    const project: Project = { id, name };
    this.projects.set(id, project);
    return project;
  }

  get(id: string): Project | undefined {
    return this.projects.get(id);
  }

  has(id: string): boolean {
    return this.projects.has(id);
  }

  list(): Project[] {
    return Array.from(this.projects.values());
  }
}
