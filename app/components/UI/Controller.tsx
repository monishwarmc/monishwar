"use client";

import { useEffect } from "react";
import { resetInput } from "../controls/inputState";
import { useIsTouch } from "../hooks/useIsTouch";
import ActionButtons from "./ActionButtons";
import Joystick from "./Joystick";
import KeyHints from "./KeyHints";

/**
 * The input HUD, picked to match the device.
 *
 * Touch gets the Free Fire layout — a floating stick and an action cluster.
 * A pointer device gets a key legend instead.
 *
 * Neither covers the canvas. Looking around is handled by FollowCamera on the
 * canvas element itself for mouse and finger alike; the full-screen DOM layer
 * that used to do it for touch also swallowed every tap, which made the 3D
 * screens unclickable on a phone.
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
      <Joystick />
      <ActionButtons />
    </>
  );
};

export default Controller;
