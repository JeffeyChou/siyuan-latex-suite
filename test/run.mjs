// Bundles test/cases.ts with esbuild (from esbuild-loader) and runs it.
import {createRequire} from "node:module";
import path from "node:path";
import {fileURLToPath, pathToFileURL} from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const require = createRequire(import.meta.url);
const esbuild = require(require.resolve("esbuild", {paths: [path.dirname(require.resolve("esbuild-loader"))]}));
const out = path.join(root, "test", ".cases.mjs");
await esbuild.build({
    entryPoints: [path.join(root, "test", "cases.ts")],
    bundle: true,
    format: "esm",
    platform: "node",
    outfile: out,
    loader: {".js": "js"},
    plugins: [{
        name: "raw",
        setup(b) {
            b.onResolve({filter: /\?raw$/}, a => ({path: path.resolve(a.resolveDir, a.path.slice(0, -4)), namespace: "raw"}));
            b.onLoad({filter: /.*/, namespace: "raw"}, async a => ({contents: (await import("node:fs")).readFileSync(a.path, "utf8"), loader: "text"}));
        },
    }],
});
await import(pathToFileURL(out).href);
