"use client";

import { useFrame, useThree } from "@react-three/fiber";
import { useEffect, useRef } from "react";
import { useSettings } from "../settings/settings";

/**
 * Keeps the canvas from working harder than it needs to.
 *
 * Two levers, both of which matter on a laptop:
 *
 * 1. A frame cap. An uncapped canvas renders as fast as the display will take
 *    it — 120fps on a high-refresh panel — for a scene that looks identical at
 *    60, and that difference is heat. Registering at priority 1 hands the
 *    render call to us (r3f stops drawing automatically as soon as any
 *    `useFrame` claims a priority), so a frame can be paced out without
 *    stopping the animation callbacks that run at priority 0.
 * 2. Stopping entirely when the tab is hidden. Browsers throttle rAF in a
 *    background tab but do not reliably stop it, and a backgrounded WebGL
 *    canvas is pure waste.
 */
const RenderGovernor = () => {
  const { frameLimit } = useSettings();

  const invalidate = useThree((state) => state.invalidate);
  const setFrameloop = useThree((state) => state.setFrameloop);

  const nextFrameAt = useRef(0);

  useEffect(() => {
    const onVisibility = () => {
      setFrameloop(document.hidden ? "never" : "always");
      if (!document.hidden) invalidate();
    };

    document.addEventListener("visibilitychange", onVisibility);
    onVisibility();

    return () => {
      document.removeEventListener("visibilitychange", onVisibility);
      setFrameloop("always");
    };
  }, [setFrameloop, invalidate]);

  useFrame(({ gl, scene, camera }) => {
    if (frameLimit) {
      // Wall-clock, not the r3f clock: pacing must not drift with it.
      const now = performance.now();

      if (now < nextFrameAt.current) return;

      // Clamp the catch-up window so a stalled tab does not burst frames.
      nextFrameAt.current = Math.max(now, nextFrameAt.current) + 1000 / frameLimit;
    }

    gl.render(scene, camera);
  }, 1);

  return null;
};

export default RenderGovernor;
