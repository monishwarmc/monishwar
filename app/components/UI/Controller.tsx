"use client";

import { useEffect } from "react";
import { resetInput } from "../controls/inputState";
import { useIsTouch } from "../hooks/useIsTouch";
import ActionButtons from "./ActionButtons";
import Joystick from "./Joystick";
import KeyHints from "./KeyHints";
import LookPad from "./LookPad";

/**
 * The input HUD, picked to match the device.
 *
 * Touch gets the Free Fire layout — a floating stick, a full-screen look pad
 * and an action cluster. A pointer device gets drag-to-look straight on the
 * canvas plus a key legend, so nothing covers the scene.
 *
 * The pieces live in their own files; this is the seam that chooses between
 * them and makes sure a HUD that unmounts mid-press does not leave an input
 * latched on.
 */
const Controller = () => {
  const isTouch = useIsTouch();

  useEffect(() => resetInput, []);

  if (!isTouch) return <KeyHints />;

  return (
    <>
      <LookPad />
      <Joystick />
      <ActionButtons />
    </>
  );
};

export default Controller;
