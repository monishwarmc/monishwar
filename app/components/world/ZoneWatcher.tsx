"use client";

import { useKeyboardControls } from "@react-three/drei";
import { useEffect } from "react";
import { ControlName } from "@/app/constants/controls.constants";
import { useSession } from "../contexts/SessionContext";
import { resetZones, toggleNearestZone } from "./zoneState";

/**
 * Binds the interact key to whichever station the avatar is standing at.
 *
 * It lives inside the canvas because that is where the keyboard context is
 * bridged and where the stations publish their proximity, but it renders
 * nothing — it is only the seam between the two.
 */
const ZoneWatcher = () => {
  const [subscribeKeys] = useKeyboardControls<ControlName>();
  const { exploring } = useSession();

  useEffect(
    () =>
      subscribeKeys(
        (state) => state.interact,
        (pressed) => {
          if (pressed) toggleNearestZone();
        },
      ),
    [subscribeKeys],
  );

  // Leaving explore mode should not leave a station flagged as in-range.
  useEffect(() => {
    if (!exploring) resetZones();
  }, [exploring]);

  return null;
};

export default ZoneWatcher;
