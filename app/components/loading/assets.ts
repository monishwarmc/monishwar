"use client";

import { useGLTF } from "@react-three/drei";
import { MODEL_URLS } from "@/app/constants/models.generated";
import { installAssetLog } from "./assetLog";

/**
 * EVERY FILE THE WORLD LOADS, IN ONE LIST.
 *
 * Add a model here when you add it to the scene. Two things follow from being
 * on this list: it is fetched up front rather than when its component first
 * renders, and it appears by name on the loading screen with its own timing.
 *
 * Order matters a little — the first entries start first — so put the big ones
 * near the top.
 *
 * ## These files are compressed, and nothing here has to know
 *
 * What ships in `public/models` is built from `models-src` by `pnpm models`:
 * textures re-encoded as WebP and capped in size, geometry and animation
 * tracks quantised and packed with meshopt. Together that took the four models
 * the scene loads from 33.3 MB to 6.9 MB.
 *
 * Decompression happens in the browser and needs no wiring, which is the
 * reason for choosing those two formats over the alternatives. `EXT_texture_webp`
 * is handled by three's own GLTFLoader, and drei's `useGLTF` installs the
 * meshopt decoder by default — and that decoder is bundled inside three-stdlib
 * with its WASM inlined, so unlike Draco it costs no extra request and depends
 * on no CDN.
 */
export const MODELS = [
  MODEL_URLS.portfolio_world,
  MODEL_URLS.monishwar,
  MODEL_URLS.tree,
  MODEL_URLS.fountain,
  MODEL_URLS.sofa,
] as const;

/**
 * Kick everything off.
 *
 * The log has to be installed *before* the first fetch or those files never
 * appear in the manifest. That is why the preloads live here rather than as
 * `useGLTF.preload(...)` at the bottom of each model file: those run the
 * moment the module is imported, which is well before React has rendered the
 * loading screen, and the manifest came out missing every model as a result.
 */
export const startLoading = () => {
  installAssetLog();
  MODELS.forEach((url) => useGLTF.preload(url));
};
