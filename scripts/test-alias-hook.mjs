// Registered via `node --import` so the alias loader applies to the whole
// test process before any test file loads.
import { register } from "node:module";

register(new URL("./test-alias-loader.mjs", import.meta.url));
