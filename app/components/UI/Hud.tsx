"use client";

import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import SettingsIcon from "@mui/icons-material/Settings";
import { ReactNode } from "react";
import { useSession } from "../contexts/SessionContext";
import { useIsTouch } from "../hooks/useIsTouch";
import { tapFeedback, useSettings } from "../settings/settings";
import Compass from "./Compass";
import Controller from "./Controller";
import EmoteWheel from "./EmoteWheel";
import GlobalHotkeys from "./GlobalHotkeys";
import Intro from "./Intro";
import LoadingScreen, { useSceneReady } from "./LoadingScreen";
import RotateHint from "./RotateHint";
import SettingsPanel from "./SettingsPanel";

const CornerButton = ({
  label,
  active,
  offset,
  onPress,
  children,
}: {
  label: string;
  active?: boolean;
  offset: string;
  onPress: () => void;
  children: ReactNode;
}) => {
  const { hudOpacity } = useSettings();

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      // Click, not pointerdown: these mount a panel where the finger is.
      onClick={() => {
        tapFeedback();
        onPress();
      }}
      style={{ opacity: hudOpacity, right: offset }}
      className={`pointer-events-auto absolute top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex h-11 w-11 touch-none items-center justify-center rounded-full border backdrop-blur-sm transition-transform duration-200 hover:scale-105 active:scale-90 ${
        active
          ? "border-emerald-300/80 bg-emerald-400/30 text-emerald-50"
          : "border-white/40 bg-black/35 text-white"
      }`}
    >
      {children}
    </button>
  );
};

/**
 * Everything drawn over the canvas.
 *
 * The wrapper itself stays click-through: drag-to-look on a pointer device
 * happens on the canvas underneath, and each piece opts back in. The settings
 * gear is the only chrome that persists — exit and fullscreen moved inside it.
 */
const Hud = () => {
  const { exploring, overlay, toggleOverlay } = useSession();
  const isTouch = useIsTouch();
  const ready = useSceneReady();

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <GlobalHotkeys />

      {ready && (
        <CornerButton
          label="Settings"
          active={overlay === "settings"}
          offset="max(0.75rem, env(safe-area-inset-right))"
          onPress={() => toggleOverlay("settings")}
        >
          <SettingsIcon fontSize="small" />
        </CornerButton>
      )}

      {/* Touch players reach emotes from the action cluster; pointer players
          need something visible once the key legend has faded. */}
      {exploring && !isTouch && (
        <CornerButton
          label="Emotes"
          active={overlay === "emotes"}
          offset="calc(max(0.75rem, env(safe-area-inset-right)) + 3.25rem)"
          onPress={() => toggleOverlay("emotes")}
        >
          <EmojiEmotionsIcon fontSize="small" />
        </CornerButton>
      )}

      <Intro />

      {exploring && (
        <>
          <Controller />
          <Compass />
          <RotateHint />
        </>
      )}

      <EmoteWheel />
      <SettingsPanel />
      <LoadingScreen />
    </div>
  );
};

export default Hud;
