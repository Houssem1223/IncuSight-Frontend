import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  // `next` n'expose pas de carte `exports` : sous ESM, ses sous-chemins doivent
  // porter leur extension (`next/link` -> `next/link.js`). Le bundler Next le
  // fait pour nous a l'execution, pas Node.
  if (/^next\/[^/.]+$/.test(specifier)) {
    return nextResolve(`${specifier}.js`, context);
  }

  const isAlias = specifier.startsWith("@/");
  const isLocal = isAlias || /^\.\.?\//.test(specifier);

  if (isLocal && !/\.[^/]+$/.test(specifier) && context.parentURL) {
    const baseUrl = isAlias
      ? new URL(`../${specifier.slice(2)}`, import.meta.url)
      : new URL(specifier, context.parentURL);

    // `/index.ts(x)` couvre les barils du dépôt (`@/src/components/ui/forms`) :
    // les bundlers résolvent un dossier vers son index, pas l'ESM de Node.
    for (const suffix of [".ts", ".tsx", "/index.ts", "/index.tsx"]) {
      const typescriptUrl = new URL(`${baseUrl.href}${suffix}`);
      try {
        await readFile(fileURLToPath(typescriptUrl));
        return { shortCircuit: true, url: typescriptUrl.href };
      } catch {
        // L'import peut cibler un autre type de module : laisser Node le résoudre.
      }
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  // node:test adds a query string when loading a mocked local module.
  if (!/\.tsx?(?:\?|$)/.test(url)) {
    return nextLoad(url, context);
  }

  const source = await readFile(fileURLToPath(url), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
      jsx: ts.JsxEmit.ReactJSX,
    },
    fileName: fileURLToPath(url),
  });

  return {
    format: "module",
    shortCircuit: true,
    source: transpiled.outputText,
  };
}
