// Minimal ESM resolve hook for the node:test money-math harness.
// Maps the tsconfig "@/*" alias to ./src/* and resolves extensionless
// relative imports (the bundler resolves those; plain Node ESM needs the
// explicit .ts) so the tests import the REAL source modules (not copies)
// without a bundler. Stdlib only, no deps.
const SRC_URL = new URL("../src/", import.meta.url).href;

const hasExt = (s) => /\.[a-z0-9]+$/i.test(s);

export async function resolve(specifier, context, nextResolve) {
  if (specifier === "@" || specifier.startsWith("@/")) {
    let rest = specifier === "@" ? "" : specifier.slice(2);
    if (rest && !hasExt(rest)) rest += ".ts";
    return nextResolve(SRC_URL + rest, context);
  }
  if ((specifier.startsWith("./") || specifier.startsWith("../")) && !hasExt(specifier)) {
    return nextResolve(new URL(specifier + ".ts", context.parentURL).href, context);
  }
  return nextResolve(specifier, context);
}
