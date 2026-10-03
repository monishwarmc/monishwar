"use client";

import { useEffect, useState } from "react";

const PORTRAIT = "(orientation: portrait)";

/** True while the viewport is taller than it is wide. */
export const useIsPortrait = () => {
  const [isPortrait, setIsPortrait] = useState(false);

  useEffect(() => {
    const query = window.matchMedia(PORTRAIT);
    const update = () => setIsPortrait(query.matches);

    update();
    query.addEventListener("change", update);

    return () => query.removeEventListener("change", update);
  }, []);

  return isPortrait;
};
