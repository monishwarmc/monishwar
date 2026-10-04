"use client";

import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import HelpOutlinedIcon from "@mui/icons-material/HelpOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { ReactNode, useSyncExternalStore } from "react";
import { useSession } from "../contexts/SessionContext";
import { useIsTouch } from "../hooks/useIsTouch";
import { tapFeedback, updateSettings, useSettings } from "../settings/settings";
import Ambience from "../audio/Ambience";
import Compass from "./Compass";
import Controller from "./Controller";
import EmoteWheel from "./EmoteWheel";
import GlobalHotkeys from "./GlobalHotkeys";
import HelpOverlay from "./HelpOverlay";
import Intro from "./Intro";
import LoadingScreen, { useSceneReady } from "./LoadingScreen";
import RotateHint from "./RotateHint";
import SettingsPanel from "./SettingsPanel";
import ZonePrompt from "./ZonePrompt";
import {
  enterFullscreen,
  getFullscreenServerSnapshot,
  getFullscreenSnapshot,
  isFullscreenSupported,
  subscribeFullscreen,
} from "./fullscreen";

const CornerButton = ({
  label,
  active,
  onPress,
  children,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  children: ReactNode;
}) => {
  const { hudOpacity } = useSettings();

  return (
    <button
      type="button"
      aria-label={label}
      aria-pressed={active}
      // Click, not pointerdown: these mount a panel where the finger is, and a
      // pointerdown handler would hand the tail of the same tap to it.
      onClick={() => {
        tapFeedback();
        onPress();
      }}
      style={{ opacity: hudOpacity }}
      className={`pointer-events-auto flex h-11 w-11 shrink-0 touch-none items-center justify-center rounded-full border backdrop-blur-sm transition-transform duration-200 hover:scale-105 active:scale-90 ${
        active
          ? "border-emerald-300/80 bg-emerald-400/30 text-emerald-50"
          : "border-white/40 bg-black/35 text-white"
      }`}
    >
      {children}
    </button>
  );
};

/** The audio control the fountain needs: one tap to mute, a tap to step up. */
const VolumeButton = () => {
  const { masterVolume, muted } = useSettings();

  const stepDown = () =>
    updateSettings({
      masterVolume: Math.max(0, Math.round((masterVolume - 0.25) * 100) / 100),
    });
  const stepUp = () =>
    updateSettings({
      muted: false,
      masterVolume: Math.min(1, Math.round((masterVolume + 0.25) * 100) / 100),
    });

  const silent = muted || masterVolume <= 0;

  return (
    <span className="pointer-events-auto flex items-center gap-1 rounded-full border border-white/40 bg-black/35 px-1 py-1 backdrop-blur-sm">
      <button
        type="button"
        aria-label="Volume down"
        onClick={() => {
          tapFeedback();
          stepDown();
        }}
        className="flex h-9 w-7 touch-none items-center justify-center rounded-full text-lg leading-none text-white/80 transition-colors hover:bg-white/10 active:scale-90"
      >
        −
      </button>

      <button
        type="button"
        aria-label={silent ? "Unmute" : "Mute"}
        aria-pressed={silent}
        onClick={() => {
          tapFeedback();
          updateSettings({
            muted: !silent,
            masterVolume: silent && masterVolume <= 0 ? 0.5 : masterVolume,
          });
        }}
        className={`flex h-9 w-9 touch-none items-center justify-center rounded-full transition-colors active:scale-90 ${
          silent ? "text-white/40" : "text-white"
        }`}
      >
        {silent ? (
          <VolumeOffIcon fontSize="small" />
        ) : (
          <VolumeUpIcon fontSize="small" />
        )}
      </button>

      <button
        type="button"
        aria-label="Volume up"
        onClick={() => {
          tapFeedback();
          stepUp();
        }}
        className="flex h-9 w-7 touch-none items-center justify-center rounded-full text-lg leading-none text-white/80 transition-colors hover:bg-white/10 active:scale-90"
      >
        +
      </button>
    </span>
  );
};

/**
 * Everything drawn over the canvas.
 *
 * The wrapper stays click-through: drag-to-look on a pointer device happens on
 * the canvas underneath, and each piece opts back in. The top-right rail holds
 * the only persistent chrome, and the fullscreen button removes itself once
 * there is nothing left for it to do.
 */
const Hud = () => {
  const { exploring, overlay, toggleOverlay, setOverlay } = useSession();
  const { hudOpacity } = useSettings();
  const isTouch = useIsTouch();
  const ready = useSceneReady();

  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    getFullscreenSnapshot,
    getFullscreenServerSnapshot,
  );

  return (
    <div className="pointer-events-none absolute inset-0 z-10">
      <GlobalHotkeys />
      <Ambience />

      {ready && (
        <div
          style={{ opacity: hudOpacity }}
          className="pointer-events-none absolute right-[max(0.75rem,env(safe-area-inset-right))] top-[max(0.75rem,env(safe-area-inset-top))] z-30 flex items-center gap-2"
        >
          {exploring && <VolumeButton />}

          {/* Nothing to offer once the window is already fullscreen, so the
              button gets out of the way rather than sitting there inert. */}
          {!isFullscreen && isFullscreenSupported() && (
            <CornerButton
              label="Enter fullscreen"
              onPress={() => void enterFullscreen()}
            >
              <FullscreenIcon fontSize="small" />
            </CornerButton>
          )}

          {exploring && (
            <>
              <CornerButton
                label="Help"
                active={overlay === "help"}
                onPress={() => toggleOverlay("help")}
              >
                <HelpOutlinedIcon fontSize="small" />
              </CornerButton>

              {!isTouch && (
                <CornerButton
                  label="Emotes"
                  active={overlay === "emotes"}
                  onPress={() => toggleOverlay("emotes")}
                >
                  <EmojiEmotionsIcon fontSize="small" />
                </CornerButton>
              )}
            </>
          )}

          <CornerButton
            label="Settings"
            active={overlay === "settings"}
            onPress={() =>
              setOverlay(overlay === "settings" ? "none" : "settings")
            }
          >
            <SettingsIcon fontSize="small" />
          </CornerButton>
        </div>
      )}

      <Intro />

      {exploring && (
        <>
          <Controller />
          <Compass />
          <ZonePrompt />
          <RotateHint />
        </>
      )}

      <EmoteWheel />
      <HelpOverlay />
      <SettingsPanel />
      <LoadingScreen />
    </div>
  );
};

export default Hud;
