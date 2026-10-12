"use client";

import { useGLTF } from "@react-three/drei";
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
 */
export const MODELS = [
  "/models/portfolio_world.glb",
  "/models/monishwar.glb",
  "/models/tree.glb",
  "/models/fountain.glb",
  "/models/sofa.glb",
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
