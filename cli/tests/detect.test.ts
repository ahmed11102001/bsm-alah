import { describe, it } from "node:test";
import assert from "node:assert/strict";

import { detectStacks, stackFromFrameworkId, type FsProbe } from "../src/commands/init/detect.js";

function probe(files: Record<string, string>): FsProbe {
  return {
    exists: (rel) => rel in files,
    readJson: (rel) => {
      const raw = files[rel];
      if (raw === undefined) return undefined;
      try {
        return JSON.parse(raw);
      } catch {
        return undefined;
      }
    },
    readText: (rel) => files[rel] ?? null,
  };
}

describe("detectStacks", () => {
  it("detects Next.js / React / plain Node from package.json", () => {
    const next = detectStacks(probe({
      "package.json": JSON.stringify({ dependencies: { next: "^14.0.0", react: "^18.0.0" } }),
      "tsconfig.json": "{}",
    }));
    assert.equal(next.length, 1);
    assert.equal(next[0]?.framework, "next");
    assert.equal(next[0]?.language, "typescript");

    const react = detectStacks(probe({
      "package.json": JSON.stringify({ dependencies: { react: "^18.0.0", "react-dom": "^18.0.0" } }),
    }));
    assert.equal(react[0]?.framework, "react");
    assert.equal(react[0]?.language, "javascript");

    const node = detectStacks(probe({
      "package.json": JSON.stringify({ dependencies: { express: "^4.0.0" } }),
    }));
    assert.equal(node[0]?.framework, "node");
  });

  it("detects Django / Flask / FastAPI from python markers", () => {
    const django = detectStacks(probe({ "requirements.txt": "Django==5.0\nrequests\n" }));
    assert.equal(django[0]?.framework, "django");

    const flask = detectStacks(probe({ "Pipfile": '[packages]\nflask = "*"\n' }));
    assert.equal(flask[0]?.framework, "flask");

    const fastapi = detectStacks(probe({ "pyproject.toml": '[tool.poetry.dependencies]\nfastapi = "^0.100"\n' }));
    assert.equal(fastapi[0]?.framework, "fastapi");

    const unknown = detectStacks(probe({ "requirements.txt": "requests\n" }));
    assert.equal(unknown.length, 0);
  });

  it("detects Laravel / Symfony from composer.json", () => {
    const laravel = detectStacks(probe({
      "composer.json": JSON.stringify({ require: { "laravel/framework": "^11.0" } }),
    }));
    assert.equal(laravel[0]?.framework, "laravel");

    const symfony = detectStacks(probe({
      "composer.json": JSON.stringify({ require: { "symfony/http-client": "^7.0" } }),
    }));
    assert.equal(symfony[0]?.framework, "symfony");
  });

  it("returns multiple candidates when ecosystems mix, none when empty", () => {
    const mixed = detectStacks(probe({
      "package.json": JSON.stringify({ dependencies: { next: "^14.0.0" } }),
      "requirements.txt": "django\n",
    }));
    assert.equal(mixed.length, 2);
    assert.equal(detectStacks(probe({})).length, 0);
  });
});

describe("stackFromFrameworkId", () => {
  it("maps ids and honors TypeScript", () => {
    assert.equal(stackFromFrameworkId("django", false)?.language, "python");
    assert.equal(stackFromFrameworkId("next", true)?.language, "typescript");
    assert.equal(stackFromFrameworkId("next", false)?.language, "javascript");
    assert.equal(stackFromFrameworkId("shell", false)?.language, "curl");
    assert.equal(stackFromFrameworkId("cobol", false), null);
  });
});
