import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import ts from "typescript";

export async function resolve(specifier, context, nextResolve) {
  const isExtensionlessRelativeImport =
    /^\.\.?\//.test(specifier) && !/\.[^/]+$/.test(specifier);

  if (isExtensionlessRelativeImport && context.parentURL) {
    const typescriptUrl = new URL(`${specifier}.ts`, context.parentURL);

    try {
      await readFile(fileURLToPath(typescriptUrl));
      return { shortCircuit: true, url: typescriptUrl.href };
    } catch {
      // L'import peut cibler un autre type de module : laisser Node le résoudre.
    }
  }

  return nextResolve(specifier, context);
}

export async function load(url, context, nextLoad) {
  if (!url.endsWith(".ts")) {
    return nextLoad(url, context);
  }

  const source = await readFile(fileURLToPath(url), "utf8");
  const transpiled = ts.transpileModule(source, {
    compilerOptions: {
      module: ts.ModuleKind.ESNext,
      target: ts.ScriptTarget.ES2022,
    },
    fileName: fileURLToPath(url),
  });

  return {
    format: "module",
    shortCircuit: true,
    source: transpiled.outputText,
  };
}
