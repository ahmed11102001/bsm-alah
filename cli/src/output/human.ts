/** Human-readable printers (default output mode). */

export interface ProjectRow {
  id: string;
  name: string;
  viewerRole?: string | undefined;
  status?: string | undefined;
  createdAt?: string | undefined;
}

function padEnd(value: string, width: number): string {
  if (value.length >= width) return value;
  return value + " ".repeat(width - value.length);
}

export function printProjects(projects: ProjectRow[]): void {
  if (projects.length === 0) {
    process.stdout.write("No projects found.\n");
    return;
  }
  const idWidth = Math.max(2, ...projects.map((p) => p.id.length)) + 2;
  const nameWidth = Math.max(4, ...projects.map((p) => p.name.length)) + 2;
  process.stdout.write(`${padEnd("ID", idWidth)}${padEnd("NAME", nameWidth)}ROLE\n`);
  for (const project of projects) {
    process.stdout.write(`${padEnd(project.id, idWidth)}${padEnd(project.name, nameWidth)}${project.viewerRole ?? "-"}\n`);
  }
}

export function printKeyValue(pairs: Array<[string, string]>): void {
  const width = Math.max(...pairs.map(([key]) => key.length)) + 2;
  for (const [key, value] of pairs) {
    process.stdout.write(`${padEnd(key + ":", width)}${value}\n`);
  }
}

export function printLine(line: string): void {
  process.stdout.write(line + "\n");
}
