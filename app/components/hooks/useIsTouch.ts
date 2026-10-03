"use client";

import { useEffect, useState } from "react";

const COARSE_POINTER = "(pointer: coarse)";

/**
 * True on devices whose primary pointer is a finger. Starts `false` so the
 * server-rendered markup and the first client render agree, then flips after
 * hydration if the device is touch-first.
 */
export const useIsTouch = () => {
  const [isTouch, setIsTouch] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(COARSE_POINTER);
    const update = () => setIsTouch(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return isTouch;
};
