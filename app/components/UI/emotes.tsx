"use client";

import { ActionName } from "../contexts/MonishwarContext";

export type Emote = {
  action: ActionName;
  label: string;
  /** PNG under /public/emotes, rendered from the avatar itself. */
  icon: string;
};

/**
 * Emote icons are the avatar performing the clip, not a glyph.
 *
 * They were produced offline by loading `monishwar.glb` headlessly, scrubbing
 * each animation to its most recognisable frame, rendering it on transparent
 * background and compositing onto a disc (`scripts/` in the session notes).
 * That beats a stock icon set twice over: the picture is literally what the
 * button does, and there is no third-party licence to carry.
 */
export const EMOTES: Emote[] = [
  {
    action: "waving_hand_gesture(hello)",
    label: "Wave",
    icon: "/emotes/wave.png",
  },
  { action: "Dancing", label: "Dance", icon: "/emotes/dance.png" },
  {
    action: "fist_pumping_hand-gesture",
    label: "Hype",
    icon: "/emotes/hype.png",
  },
  { action: "Acknowledging", label: "Agree", icon: "/emotes/agree.png" },
  { action: "Fighting_pose", label: "Fight", icon: "/emotes/fight.png" },
  {
    action: "crouch_sitting_pose",
    label: "Crouch",
    icon: "/emotes/crouch.png",
  },
  {
    action: "saluting_hand_gesture",
    label: "Salute",
    icon: "/emotes/salute.png",
  },
  { action: "Stretching_arms", label: "Stretch", icon: "/emotes/stretch.png" },
];

/** Clips without a rendered icon, listed as text in the settings panel. */
export const EXTRA_EMOTES: { action: ActionName; label: string }[] = [
  { action: "sitting_on_chair", label: "Sit on sofa" },
  { action: "Sitting_down_on_floor_pose", label: "Sit on floor" },
  { action: "Knee_down_pose", label: "Kneel" },
  { action: "Sad_disappointed_action", label: "Disappointed" },
  { action: "Dismissing_hand_gesture", label: "Dismiss" },
  { action: "showing_the_background-hand_gesture", label: "Present" },
  { action: "Agreeing", label: "Nod" },
];

export const CONTROL_ICONS = {
  jump: "/emotes/jump.png",
  run: "/emotes/run.png",
  walk: "/emotes/walk.png",
} as const;
