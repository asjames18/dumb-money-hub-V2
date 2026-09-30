// Post-build patch for the generated Cloudflare worker config.
//
// `npm run build` regenerates `.output/server/wrangler.json` from the
// TanStack/nitro pipeline, which has no knob for extra bindings. This script
// merges the durable bits from `wrangler.patch.json` (repo root) into the
// generated config so every deploy keeps them. No-op if either file is
// missing — the build must never fail because of analytics wiring.

import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";

const root = resolve(join(import.meta.dirname, ".."));
const generated = join(root, ".output", "server", "wrangler.json");
const patchFile = join(root, "wrangler.patch.json");

if (!existsSync(generated) || !existsSync(patchFile)) {
  process.exit(0);
}

const config = JSON.parse(readFileSync(generated, "utf8"));
const patch = JSON.parse(readFileSync(patchFile, "utf8"));

for (const [key, value] of Object.entries(patch)) {
  if (key === "kv_namespaces" && Array.isArray(value)) {
    const current = Array.isArray(config.kv_namespaces) ? config.kv_namespaces : [];
    const seen = new Set(current.map((ns) => ns.binding));
    for (const ns of value) {
      if (!seen.has(ns.binding)) {
        current.push(ns);
        seen.add(ns.binding);
      }
    }
    config.kv_namespaces = current;
  } else {
    config[key] = value;
  }
}

writeFileSync(generated, JSON.stringify(config, null, 2) + "\n");
console.log("patched .output/server/wrangler.json with wrangler.patch.json");
