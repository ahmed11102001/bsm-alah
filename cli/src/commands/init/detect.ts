/**
 * Framework detection for `wani init` (pure logic over an injectable probe,
 * so it is unit-testable without touching the real filesystem).
 */
import * as fs from "node:fs";
import * as path from "node:path";

export type InitLanguage = "javascript" | "typescript" | "python" | "php" | "curl";

export type InitFramework =
  | "node" | "next" | "react"
  | "django" | "flask" | "fastapi"
  | "laravel" | "symfony"
  | "shell";

export interface DetectedStack {
  language: InitLanguage;
  framework: InitFramework;
  typescript: boolean;
  display: string;
  reason: string;
}

export interface FsProbe {
  exists: (relPath: string) => boolean;
  readJson: (relPath: string) => unknown;
  readText: (relPath: string) => string | null;
}

export function realFsProbe(cwd: string): FsProbe {
  return {
    exists: (rel) => fs.existsSync(path.join(cwd, rel)),
    readJson: (rel) => {
      try {
        return JSON.parse(fs.readFileSync(path.join(cwd, rel), "utf8"));
      } catch {
        return undefined;
      }
    },
    readText: (rel) => {
      try {
        const stats = fs.statSync(path.join(cwd, rel));
        if (stats.size > 256 * 1024) return null;
        return fs.readFileSync(path.join(cwd, rel), "utf8");
      } catch {
        return null;
      }
    },
  };
}

export const FRAMEWORK_CHOICES: { id: InitFramework; language: InitLanguage; label: string }[] = [
  { id: "node", language: "javascript", label: "Node.js" },
  { id: "next", language: "javascript", label: "Next.js" },
  { id: "react", language: "javascript", label: "React" },
  { id: "django", language: "python", label: "Django" },
  { id: "flask", language: "python", label: "Flask" },
  { id: "fastapi", language: "python", label: "FastAPI" },
  { id: "laravel", language: "php", label: "Laravel" },
  { id: "symfony", language: "php", label: "Symfony" },
  { id: "shell", language: "curl", label: "Shell (cURL)" },
];

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null;
}

function depNames(packageJson: unknown): Set<string> {
  const out = new Set<string>();
  if (!isRecord(packageJson)) return out;
  for (const section of ["dependencies", "devDependencies", "peerDependencies"]) {
    const deps = packageJson[section];
    if (isRecord(deps)) {
      for (const name of Object.keys(deps)) out.add(name);
    }
  }
  return out;
}

/** Confident matches only — ambiguous/generic ecosystems are left out. */
export function detectStacks(probe: FsProbe): DetectedStack[] {
  const found: DetectedStack[] = [];

  const packageJson = probe.readJson("package.json");
  if (isRecord(packageJson)) {
    const deps = depNames(packageJson);
    const typescript = probe.exists("tsconfig.json") || deps.has("typescript");
    const language: InitLanguage = typescript ? "typescript" : "javascript";
    if (deps.has("next")) {
      found.push({ language, framework: "next", typescript, display: "Next.js", reason: "package.json depends on next" });
    } else if (deps.has("react") || deps.has("react-dom")) {
      found.push({ language, framework: "react", typescript, display: "React", reason: "package.json depends on react" });
    } else {
      found.push({ language, framework: "node", typescript, display: "Node.js", reason: "package.json without a UI framework" });
    }
  }

  const composer = probe.readJson("composer.json");
  if (isRecord(composer) && isRecord(composer["require"])) {
    const req = Object.keys(composer["require"] as Record<string, unknown>);
    if (req.some((n) => n === "laravel/framework")) {
      found.push({ language: "php", framework: "laravel", typescript: false, display: "Laravel", reason: "composer requires laravel/framework" });
    } else if (req.some((n) => n.startsWith("symfony/"))) {
      found.push({ language: "php", framework: "symfony", typescript: false, display: "Symfony", reason: "composer requires symfony/*" });
    }
  }

  const pythonMarker =
    probe.exists("requirements.txt") ||
    probe.exists("Pipfile") ||
    probe.exists("poetry.lock") ||
    probe.exists("pyproject.toml");
  if (pythonMarker) {
    const haystack = [
      probe.readText("requirements.txt"),
      probe.readText("Pipfile"),
      probe.readText("pyproject.toml"),
    ]
      .filter((t): t is string => typeof t === "string")
      .join("\n")
      .toLowerCase();
    const has = (name: string): boolean => new RegExp(`\\b${name}\\b`).test(haystack);
    if (has("django")) {
      found.push({ language: "python", framework: "django", typescript: false, display: "Django", reason: "python dependencies mention django" });
    } else if (has("flask")) {
      found.push({ language: "python", framework: "flask", typescript: false, display: "Flask", reason: "python dependencies mention flask" });
    } else if (has("fastapi")) {
      found.push({ language: "python", framework: "fastapi", typescript: false, display: "FastAPI", reason: "python dependencies mention fastapi" });
    }
  }

  return found;
}

/** Resolve a --framework flag value to a full stack (or null when unknown). */
export function stackFromFrameworkId(
  frameworkId: string,
  typescript: boolean
): DetectedStack | null {
  const choice = FRAMEWORK_CHOICES.find((c) => c.id === frameworkId);
  if (!choice) return null;
  const language: InitLanguage =
    choice.language === "javascript" && typescript ? "typescript" : choice.language;
  return {
    language,
    framework: choice.id,
    typescript: language === "typescript",
    display: choice.label,
    reason: "--framework flag",
  };
}
