"use client";

import EmojiEmotionsIcon from "@mui/icons-material/EmojiEmotions";
import FullscreenIcon from "@mui/icons-material/Fullscreen";
import HelpOutlinedIcon from "@mui/icons-material/HelpOutlined";
import SettingsIcon from "@mui/icons-material/Settings";
import VolumeOffIcon from "@mui/icons-material/VolumeOff";
import VolumeUpIcon from "@mui/icons-material/VolumeUp";
import { ReactNode, useSyncExternalStore } from "react";
import { press } from "../audio/sfx";
import { useSession } from "../contexts/SessionContext";
import { useIsTouch } from "../hooks/useIsTouch";
import { updateSettings, useSettings } from "../settings/settings";
import Compass from "./Compass";
import Controller from "./Controller";
import EmoteWheel from "./EmoteWheel";
import GlobalHotkeys from "./GlobalHotkeys";
import Intro from "./Intro";
import Onboarding from "./guide/Onboarding";
import LoadingScreen, { useSceneReady } from "./LoadingScreen";
import RotateHint from "./RotateHint";
import SettingsPanel from "./SettingsPanel";
import CertificateViewer from "./CertificateViewer";
import SkillsPanel from "./SkillsPanel";
import InteractPrompt from "./InteractPrompt";
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
        press();
        onPress();
      }}
      style={{ opacity: hudOpacity }}
      className={`pointer-events-auto flex h-10 w-10 shrink-0 touch-none items-center justify-center rounded-2xl border shadow-lg backdrop-blur-md transition duration-200 hover:-translate-y-0.5 active:scale-90 ${
        active
          ? "border-emerald-200/70 bg-emerald-300/20 text-emerald-50 shadow-emerald-300/10"
          : "border-white/15 bg-[#07131d]/75 text-white/85 hover:border-emerald-200/40 hover:text-white"
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
    <span className="pointer-events-auto flex items-center gap-1 rounded-2xl border border-white/15 bg-[#07131d]/75 px-1 py-1 shadow-lg backdrop-blur-md">
      <button
        type="button"
        aria-label="Volume down"
        onClick={() => {
          press();
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
          press();
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
          press();
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
                label="How to play"
                active={overlay === "guide"}
                onPress={() => toggleOverlay("guide")}
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
          <InteractPrompt />
          <CertificateViewer />
          <SkillsPanel />
          <RotateHint />
        </>
      )}

      <EmoteWheel />
      <Onboarding />
      <SettingsPanel />
      <LoadingScreen />
    </div>
  );
};

export default Hud;
