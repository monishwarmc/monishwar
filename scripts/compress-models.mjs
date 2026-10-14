/**
 * MODEL COMPRESSION — `pnpm models`
 *
 * Reads the authored GLBs out of `models-src/` and writes shippable ones into
 * `public/models/`. Never run it in place: every lossy pass compounds, so a
 * model that has been through this twice has been through it twice.
 *
 * ## What it does, and why in that order
 *
 * The models in this scene are not heavy because of their geometry. The whole
 * world is 6,852 triangles and the avatar 28,040 — nothing. They are heavy
 * because of *textures*: 17.8 MB of the spaceship's 18.2 MB is image data, and
 * a single 4K ground diffuse accounted for 7.2 MB of it. So:
 *
 *   1. `resize`  — caps texture dimensions. This is the big lever: halving a
 *                  4K map to 2K removes three quarters of its pixels. Nothing
 *                  else comes close.
 *   2. `webp`    — re-encodes what is left. PNG is a terrible format for photo
 *                  data and three of the worst offenders here were PNGs.
 *   3. `meshopt` — quantises and compresses vertex data. Only the avatar gets
 *                  this, for the reason set out above `MODELS` below, and the
 *                  avatar is also the only model where it would pay: its morph
 *                  targets are 8.66 MB on their own.
 *
 * ## Why meshopt and not Draco
 *
 * Both are supported by three.js and both are enabled by default in drei's
 * `useGLTF`. Meshopt wins here for one reason: its decoder is bundled inside
 * three-stdlib with the WASM inlined, so there is no second network request
 * and no CDN to depend on. Draco's decoder is a separate ~300 KB fetch that
 * drei points at gstatic by default — a third-party blocking dependency on the
 * critical path, to save less than meshopt does on a scene this light on
 * geometry.
 *
 * ## One known cost: the avatar ends up with eleven skeletons
 *
 * Quantisation bakes a per-mesh scale into the geometry, and the inverse bind
 * matrices have to compensate for it, so a skin shared by several meshes comes
 * out as one specialised skin per mesh. `monishwar.glb` goes from 1 skin to 11,
 * all with the same 54 joints but different matrices, which means three.js
 * builds 11 Skeletons where it used to build one — about 540 extra matrix
 * multiplications per frame.
 *
 * That is measured in microseconds and it buys 11 MB off the critical path, so
 * it is the right trade here. It cannot be undone with `dedup`: the matrices
 * genuinely differ, and re-writing the file after `meshopt` would decompress it
 * anyway. Worth knowing before you add a second skinned character.
 *
 * ## Quality settings
 *
 * Colour maps are encoded at quality 80, and normal, metallic-roughness and
 * occlusion maps at 90. That split matters: lossy artefacts in a colour map
 * read as slightly soft, while the same artefacts in a normal map read as
 * *dents*, because the values are being used as geometry rather than colour.
 *
 * Both are lossy, which looks wrong for a normal map until you try the
 * alternative. Near-lossless WebP made this scene *larger*: most of these maps
 * were already lossy JPEGs, and encoding one of those near-losslessly spends
 * real bytes preserving the artefacts of the last encoder. The solar panel's
 * normal map went from 0.55 MB to 1.13 MB that way.
 */

import { execFileSync } from "node:child_process";
import { createHash } from "node:crypto";
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  renameSync,
  rmSync,
  statSync,
  writeFileSync,
} from "node:fs";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const SOURCE = join(ROOT, "models-src");
const OUTPUT = join(ROOT, "public", "models");

/** The generated module the app imports its model URLs from. */
const MANIFEST = join(ROOT, "app", "constants", "models.generated.ts");

/**
 * WHAT EACH MODEL GETS.
 *
 * `textures` is the budget for the longest edge of any map, in pixels. These
 * are chosen against how large the thing ever gets on screen, not against what
 * the source happens to be: the ground is directly under the camera at all
 * times so it keeps 2K, while the fountain is scenery you walk past.
 *
 * `geometry` is the one to be careful with. Read the next comment before
 * turning it on for anything.
 */
const MODELS = {
  "portfolio_world.glb": { textures: 2048, geometry: false },
  "monishwar.glb": { textures: 1024, geometry: true },
  "fountain.glb": { textures: 1024, geometry: false },
  "sofa.glb": { textures: 1024, geometry: false },
};

const DEFAULT = { textures: 1024, geometry: false };

/**
 * ### Why `geometry` is off for everything but the avatar
 *
 * Meshopt quantisation rescales a mesh's vertices into a normalised range and
 * puts the scale that undoes it on the mesh's *node*. For `portfolio_world`
 * that turned four nodes with no transform at all into four nodes carrying a
 * 25x scale and an offset.
 *
 * That is correct glTF, and any loader that walks the file renders it
 * perfectly. It is not what this codebase does. The model components here were
 * generated by gltfjsx, which does not instance the loaded scene — it writes
 * out the hierarchy by hand and pulls `geometry` off each node:
 *
 *     <mesh name="frame" geometry={nodes.frame.geometry} material={...} />
 *
 * There is nowhere in that for a node transform to go, so the compensation is
 * silently dropped and the whole spaceship collapses into a one-unit speck at
 * the origin. No error, no warning, just an empty-looking scene.
 *
 * The avatar is the exception, and not by luck: its meshes are *skinned*, so
 * the dequantisation is absorbed into the skin's inverse bind matrices instead
 * of into a node transform. Nothing a component could drop. Its mesh nodes come
 * out of the pass with exactly the transforms they went in with.
 *
 * It is also the only model where this matters. Geometry is 8.66 MB of the
 * avatar — almost all of it morph targets for the face — against 0.41 MB for
 * the whole spaceship. Turning the pass off for the static models costs about
 * 0.5 MB in total and removes the entire class of bug.
 *
 * So: turn `geometry` on only for a skinned model, or for one whose component
 * renders the loaded object rather than re-deriving it. If you ever re-run
 * gltfjsx *against the compressed file*, the generated component will contain
 * the node transforms and this restriction lifts.
 */

/** Maps that are read as data rather than as colour, and so stay sharp. */
const DATA_SLOTS = "{normalTexture,occlusionTexture,metallicRoughnessTexture}";

/**
 * The CLI's entry point.
 *
 * Addressed by path rather than through `require.resolve`, which cannot see
 * it: the package declares an `exports` map that does not list `./bin/cli.js`,
 * so resolving the subpath throws even though the file is right there.
 */
const CLI = join(ROOT, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");

if (!existsSync(CLI)) {
  throw new Error("@gltf-transform/cli is not installed. Run `pnpm install`.");
}

const run = (command, input, output, ...options) => {
  execFileSync(process.execPath, [CLI, command, input, output, ...options], {
    stdio: ["ignore", "ignore", "inherit"],
  });
};

const megabytes = (path) => statSync(path).size / 1e6;

const compress = (name) => {
  const source = join(SOURCE, name);
  const target = join(OUTPUT, name);
  const { textures: width, geometry } = MODELS[name] ?? DEFAULT;

  // Each pass reads the previous pass's output, so they go through scratch
  // files rather than being chained in memory: `gltf-transform` has no pipe.
  //
  // They have to keep the .glb extension. The writer picks its format from it,
  // and an unrecognised one — .tmp, as this first had — makes it write loose
  // glTF instead: a JSON file plus every texture and buffer as a separate
  // sibling. Deleting the scratch file then leaves seventy-odd orphans behind
  // in public/models.
  const scratch = [1, 2, 3].map((step) => `${target}.step${step}.glb`);

  try {
    run("resize", source, scratch[0], "--width", `${width}`, "--height", `${width}`);

    // Colour first, then the data maps, because `--slots` takes one glob and
    // the two groups want opposite quality settings.
    run("webp", scratch[0], scratch[1], "--slots", `!${DATA_SLOTS}`, "--quality", "80");
    run("webp", scratch[1], scratch[2], "--slots", DATA_SLOTS, "--quality", "90");

    if (geometry) {
      run("meshopt", scratch[2], target, "--level", "high");
    } else {
      // Still a real pass: it repacks the buffers and drops anything the
      // texture work orphaned. It just leaves vertex data alone.
      run("copy", scratch[2], target);
    }

    const before = megabytes(source);
    const after = megabytes(target);
    const saved = (1 - after / before) * 100;

    // Put the content hash in the filename. See the note above MANIFEST.
    const hash = createHash("sha256")
      .update(readFileSync(target))
      .digest("hex")
      .slice(0, 8);

    const stem = name.replace(/\.glb$/, "");
    const hashed = `${stem}.${hash}.glb`;

    renameSync(target, join(OUTPUT, hashed));

    console.log(
      `  ${name.padEnd(22)} ${before.toFixed(2).padStart(6)} MB  ->  ` +
        `${after.toFixed(2).padStart(6)} MB   (-${saved.toFixed(0)}%)   ${hash}`,
    );

    return { before, after, stem, url: `/models/${hashed}` };
  } finally {
    scratch.forEach((path) => rmSync(path, { force: true }));
  }
};

mkdirSync(OUTPUT, { recursive: true });

// Wipe the output first. Hashed names mean a rebuild writes new files rather
// than overwriting the old ones, so without this the folder only ever grows.
for (const stale of readdirSync(OUTPUT)) {
  rmSync(join(OUTPUT, stale), { force: true });
}

const models = readdirSync(SOURCE).filter((name) => name.endsWith(".glb"));

if (models.length === 0) {
  throw new Error(`No .glb files in ${SOURCE}`);
}

console.log(`\nCompressing ${models.length} models from models-src/\n`);

const results = models.map(compress);

const totals = results.reduce(
  (sum, { before, after }) => ({
    before: sum.before + before,
    after: sum.after + after,
  }),
  { before: 0, after: 0 },
);

console.log(
  `\n  ${"total".padEnd(22)} ${totals.before.toFixed(2).padStart(6)} MB  ->  ` +
    `${totals.after.toFixed(2).padStart(6)} MB   ` +
    `(-${((1 - totals.after / totals.before) * 100).toFixed(0)}%)\n`,
);

const entries = results
  .slice()
  .sort((a, b) => a.stem.localeCompare(b.stem))
  .map(({ stem, url }) => `  ${stem}: "${url}",`)
  .join("\n");

writeFileSync(
  MANIFEST,
  `/**
 * GENERATED BY \`pnpm models\` — DO NOT EDIT.
 *
 * Every model URL carries a hash of the file's contents, so changing a model
 * changes its URL. That is what lets \`next.config.ts\` serve these with
 * \`immutable\` caching: a browser may keep one of these files forever,
 * because a rebuilt model is simply a different file at a different address.
 *
 * Load models through this map rather than by typing the path. A literal
 * "/models/thing.glb" is not a real URL any more and will 404.
 */
export const MODEL_URLS = {
${entries}
} as const;

export type ModelName = keyof typeof MODEL_URLS;
`,
);

console.log(`  manifest -> ${MANIFEST.replace(ROOT + "/", "")}\n`);
