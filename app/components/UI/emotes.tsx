"use client";

import { ComponentType } from "react";
import AccessibilityNewIcon from "@mui/icons-material/AccessibilityNew";
import ChairIcon from "@mui/icons-material/Chair";
import CelebrationIcon from "@mui/icons-material/Celebration";
import MilitaryTechIcon from "@mui/icons-material/MilitaryTech";
import MusicNoteIcon from "@mui/icons-material/MusicNote";
import PanToolIcon from "@mui/icons-material/PanTool";
import SelfImprovementIcon from "@mui/icons-material/SelfImprovement";
import SentimentDissatisfiedIcon from "@mui/icons-material/SentimentDissatisfied";
import SportsKabaddiIcon from "@mui/icons-material/SportsKabaddi";
import SportsMmaIcon from "@mui/icons-material/SportsMma";
import ThumbUpIcon from "@mui/icons-material/ThumbUp";
import WavingHandIcon from "@mui/icons-material/WavingHand";
import { ActionName } from "../contexts/MonishwarContext";

export type Emote = {
  action: ActionName;
  label: string;
  Icon: ComponentType<{ fontSize?: "small" | "medium" | "large" }>;
};

/**
 * The emote wheel, in ring order starting at the top and going clockwise.
 *
 * Twelve would crowd the ring on a phone, so this is the eight that read
 * clearly as icons; the rest of the clips stay reachable from the settings
 * panel's animation list.
 */
export const EMOTES: Emote[] = [
  { action: "waving_hand_gesture(hello)", label: "Wave", Icon: WavingHandIcon },
  { action: "Dancing", label: "Dance", Icon: MusicNoteIcon },
  { action: "fist_pumping_hand-gesture", label: "Hype", Icon: CelebrationIcon },
  { action: "Acknowledging", label: "Agree", Icon: ThumbUpIcon },
  { action: "Fighting_pose", label: "Fight", Icon: SportsMmaIcon },
  { action: "crouch_sitting_pose", label: "Crouch", Icon: SelfImprovementIcon },
  { action: "saluting_hand_gesture", label: "Salute", Icon: MilitaryTechIcon },
  { action: "Stretching_arms", label: "Stretch", Icon: AccessibilityNewIcon },
];

/** Everything the avatar can play, for the settings panel's full list. */
export const EXTRA_EMOTES: Emote[] = [
  { action: "sitting_on_chair", label: "Sit on sofa", Icon: ChairIcon },
  { action: "Sitting_down_on_floor_pose", label: "Sit on floor", Icon: ChairIcon },
  { action: "Knee_down_pose", label: "Kneel", Icon: SportsKabaddiIcon },
  { action: "Sad_disappointed_action", label: "Disappointed", Icon: SentimentDissatisfiedIcon },
  { action: "Dismissing_hand_gesture", label: "Dismiss", Icon: PanToolIcon },
  { action: "showing_the_background-hand_gesture", label: "Present", Icon: PanToolIcon },
  { action: "Agreeing", label: "Nod", Icon: ThumbUpIcon },
];
