"use client";

import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState, useSyncExternalStore } from "react";
import {
  CONTROL_LABELS,
  ControlName,
  FOLLOW_CAMERA,
  describeKey,
} from "@/app/constants/controls.constants";
import { useSession } from "../contexts/SessionContext";
import { useMonishwar } from "../contexts/MonishwarContext";
import { useIsTouch } from "../hooks/useIsTouch";
import {
  Quality,
  resetSettings,
  setBinding,
  tapFeedback,
  updateSettings,
  useSettings,
} from "../settings/settings";
import {
  getFullscreenServerSnapshot,
  getFullscreenSnapshot,
  isFullscreenSupported,
  subscribeFullscreen,
  toggleFullscreen,
} from "./fullscreen";
import { EMOTES, EXTRA_EMOTES } from "./emotes";
import {
  DangerButton,
  Section,
  Segmented,
  Slider,
  Toggle,
} from "./primitives/Controls";

const TABS = [
  { id: "controls", label: "Controls" },
  { id: "camera", label: "Camera" },
  { id: "movement", label: "Move" },
  { id: "display", label: "Display" },
  { id: "keys", label: "Keys" },
  { id: "session", label: "Session" },
] as const;

type TabId = (typeof TABS)[number]["id"];

const percent = (value: number) => `${Math.round(value * 100)}%`;

/** Captures the next key press and assigns it to the action being rebound. */
const useKeyCapture = (
  capturing: ControlName | null,
  onCaptured: (name: ControlName, key: string) => void,
  onCancel: () => void,
) => {
  useEffect(() => {
    if (!capturing) return;

    const handle = (event: KeyboardEvent) => {
      event.preventDefault();
      event.stopPropagation();

      if (event.key === "Escape") onCancel();
      else onCaptured(capturing, event.key);
    };

    // Capture phase so drei's own window listener does not act on the press
    // the player is only trying to assign.
    window.addEventListener("keydown", handle, { capture: true });
    return () => window.removeEventListener("keydown", handle, { capture: true });
  }, [capturing, onCaptured, onCancel]);
};

const KeyBindingRow = ({
  name,
  label,
  keys,
  capturing,
  onStartCapture,
  onRemove,
}: {
  name: ControlName;
  label: string;
  keys: string[];
  capturing: boolean;
  onStartCapture: (name: ControlName) => void;
  onRemove: (name: ControlName, key: string) => void;
}) => (
  <div className="flex items-center justify-between gap-3 py-2">
    <span className="text-sm text-white/85">{label}</span>

    <div className="flex flex-wrap items-center justify-end gap-1">
      {keys.map((key) => (
        <button
          key={key}
          type="button"
          // A binding needs at least one key or the action becomes unreachable.
          disabled={keys.length < 2}
          onClick={() => onRemove(name, key)}
          title={keys.length < 2 ? "Add another key first" : "Remove this key"}
          className="rounded border border-white/25 bg-white/10 px-2 py-1 font-mono text-[11px] uppercase text-white/85 enabled:hover:border-red-400/70 enabled:hover:text-red-300 disabled:opacity-60"
        >
          {describeKey(key)}
        </button>
      ))}

      <button
        type="button"
        onClick={() => onStartCapture(name)}
        className={`rounded border px-2 py-1 text-[11px] ${
          capturing
            ? "animate-pulse border-emerald-300 bg-emerald-400/25 text-emerald-100"
            : "border-white/25 text-white/60 hover:border-white/50 hover:text-white"
        }`}
      >
        {capturing ? "press a key…" : "+"}
      </button>
    </div>
  </div>
);

/**
 * Everything the player can change, in one sheet.
 *
 * It is a right-hand drawer on a wide screen and a full-height sheet on a
 * phone, because a drawer narrower than a thumb is no use in landscape.
 */
const SettingsPanel = () => {
  const { overlay, setOverlay, stopExploring, exploring } = useSession();
  const { setAnimation } = useMonishwar();
  const settings = useSettings();
  const isTouch = useIsTouch();

  const [tab, setTab] = useState<TabId>("controls");
  const [capturing, setCapturing] = useState<ControlName | null>(null);

  const isFullscreen = useSyncExternalStore(
    subscribeFullscreen,
    getFullscreenSnapshot,
    getFullscreenServerSnapshot,
  );

  useKeyCapture(
    capturing,
    (name, key) => {
      const existing = settings.bindings[name];
      if (!existing.includes(key)) setBinding(name, [...existing, key]);
      setCapturing(null);
    },
    () => setCapturing(null),
  );

  if (overlay !== "settings") return null;

  const close = () => {
    setCapturing(null);
    setOverlay("none");
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-[2px]"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <aside className="flex h-full w-full max-w-[26rem] flex-col border-l border-white/10 bg-[#0b0f14]/95 shadow-2xl sm:w-[26rem]">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div>
            <h2 className="text-base font-semibold text-white">Settings</h2>
            <p className="text-[11px] text-white/45">Saved on this device</p>
          </div>
          <button
            type="button"
            aria-label="Close settings"
            onClick={close}
            className="rounded-full p-2 text-white/70 transition-colors hover:bg-white/10 hover:text-white"
          >
            <CloseIcon fontSize="small" />
          </button>
        </header>

        {/* Six tabs have to fit 416px without the last one hanging off the
            edge, so they wrap rather than scroll out of sight. */}
        <nav className="flex flex-wrap gap-1 border-b border-white/10 px-2 py-2">
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`shrink-0 rounded-lg px-2.5 py-1.5 text-[11px] font-medium transition-colors ${
                tab === id
                  ? "bg-emerald-400/90 text-black"
                  : "text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {label}
            </button>
          ))}
        </nav>

        <div className="flex-1 overflow-y-auto overscroll-contain px-4 pb-8">
          {tab === "controls" && (
            <>
              <Section title="Look">
                <Slider
                  label="Look sensitivity"
                  value={settings.lookSensitivity}
                  min={0.3}
                  max={3}
                  step={0.05}
                  format={(value) => `${value.toFixed(2)}×`}
                  onChange={(lookSensitivity) =>
                    updateSettings({ lookSensitivity })
                  }
                />
                <Toggle
                  label="Invert look — vertical"
                  value={settings.invertLookY}
                  onChange={(invertLookY) => updateSettings({ invertLookY })}
                />
                <Toggle
                  label="Invert look — horizontal"
                  hint="Flips the orbit direction away from the OrbitControls default"
                  value={settings.invertLookX}
                  onChange={(invertLookX) => updateSettings({ invertLookX })}
                />
              </Section>

              <Section title="Touch HUD">
                <Toggle
                  label="Left-handed layout"
                  hint="Stick on the right, actions on the left"
                  value={settings.mirrorHud}
                  onChange={(mirrorHud) => updateSettings({ mirrorHud })}
                />
                <Toggle
                  label="Floating stick"
                  hint="The stick re-seats wherever your thumb lands"
                  value={settings.floatingStick}
                  onChange={(floatingStick) => updateSettings({ floatingStick })}
                />
                <Slider
                  label="Stick size"
                  value={settings.stickScale}
                  min={0.7}
                  max={1.5}
                  step={0.05}
                  format={percent}
                  onChange={(stickScale) => updateSettings({ stickScale })}
                />
                <Slider
                  label="HUD opacity"
                  value={settings.hudOpacity}
                  min={0.3}
                  max={1}
                  step={0.05}
                  format={percent}
                  onChange={(hudOpacity) => updateSettings({ hudOpacity })}
                />
                <Toggle
                  label="Haptic feedback"
                  hint="Short buzz on HUD presses, where supported"
                  value={settings.hapticFeedback}
                  onChange={(hapticFeedback) =>
                    updateSettings({ hapticFeedback })
                  }
                />
              </Section>

              <Section title="Advanced">
                <Toggle
                  label="Steering cancels auto-run"
                  hint="Off: the stick steers while auto-run keeps the pace"
                  value={settings.autoRunCancelsOnSteer}
                  onChange={(autoRunCancelsOnSteer) =>
                    updateSettings({ autoRunCancelsOnSteer })
                  }
                />
                <Toggle
                  label="Full tilt runs"
                  hint="Pushing the stick to the rim runs without the button"
                  value={settings.stickFullTiltRuns}
                  onChange={(stickFullTiltRuns) =>
                    updateSettings({ stickFullTiltRuns })
                  }
                />
                <Toggle
                  label="Show key hints"
                  value={settings.showKeyHints}
                  onChange={(showKeyHints) => updateSettings({ showKeyHints })}
                />
                <Toggle
                  label="Show compass"
                  value={settings.showCompass}
                  onChange={(showCompass) => updateSettings({ showCompass })}
                />
              </Section>
            </>
          )}

          {tab === "camera" && (
            <Section title="Third-person camera">
              <Slider
                label="Distance"
                value={settings.cameraDistance}
                min={FOLLOW_CAMERA.minDistance}
                max={FOLLOW_CAMERA.maxDistance}
                step={0.01}
                format={(value) => value.toFixed(2)}
                onChange={(cameraDistance) => updateSettings({ cameraDistance })}
              />
              <Slider
                label="Shoulder height"
                value={settings.cameraHeight}
                min={0.015}
                max={0.08}
                step={0.002}
                format={(value) => value.toFixed(3)}
                onChange={(cameraHeight) => updateSettings({ cameraHeight })}
              />
              <Slider
                label="Field of view"
                value={settings.fieldOfView}
                min={50}
                max={100}
                step={1}
                format={(value) => `${value.toFixed(0)}°`}
                onChange={(fieldOfView) => updateSettings({ fieldOfView })}
              />
              <Slider
                label="Follow smoothing"
                value={settings.cameraSmoothing}
                min={0.3}
                max={2.5}
                step={0.05}
                format={(value) => `${value.toFixed(2)}×`}
                onChange={(cameraSmoothing) => updateSettings({ cameraSmoothing })}
              />
            </Section>
          )}

          {tab === "movement" && (
            <Section title="Avatar">
              <Slider
                label="Walk speed"
                value={settings.walkSpeed}
                min={0.02}
                max={0.12}
                step={0.005}
                format={(value) => value.toFixed(3)}
                onChange={(walkSpeed) => updateSettings({ walkSpeed })}
              />
              <Slider
                label="Run speed"
                value={settings.runSpeed}
                min={0.06}
                max={0.3}
                step={0.005}
                format={(value) => value.toFixed(3)}
                onChange={(runSpeed) => updateSettings({ runSpeed })}
              />
              <Slider
                label="Jump power"
                value={settings.jumpPower}
                min={0.05}
                max={0.3}
                step={0.005}
                format={(value) => value.toFixed(3)}
                onChange={(jumpPower) => updateSettings({ jumpPower })}
              />
              <Slider
                label="Turn rate"
                value={settings.turnRate}
                min={3}
                max={25}
                step={0.5}
                format={(value) => value.toFixed(1)}
                onChange={(turnRate) => updateSettings({ turnRate })}
              />
            </Section>
          )}

          {tab === "display" && (
            <>
              <Section title="Quality">
                <Segmented<Quality>
                  label="Render resolution"
                  value={settings.quality}
                  options={[
                    { value: "low", label: "Low" },
                    { value: "balanced", label: "Balanced" },
                    { value: "high", label: "High" },
                  ]}
                  onChange={(quality) => updateSettings({ quality })}
                />
                <p className="pb-2 text-xs text-white/45">
                  Lower this first if the frame rate drops on a phone — it caps
                  the pixel ratio rather than changing what is drawn.
                </p>
                <Toggle
                  label="Starfield background"
                  value={settings.showBackground}
                  onChange={(showBackground) => updateSettings({ showBackground })}
                />
              </Section>

              <Section title="Animations">
                <p className="pb-2 text-xs text-white/45">
                  The wheel holds the eight quick ones. Everything else lives
                  here.
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {[...EMOTES, ...EXTRA_EMOTES].map(({ action, label, Icon }) => (
                    <button
                      key={action}
                      type="button"
                      onClick={() => {
                        tapFeedback();
                        setAnimation(action);
                      }}
                      className="flex items-center gap-2 rounded-lg border border-white/15 bg-white/5 px-3 py-2 text-left text-xs text-white/80 transition-colors hover:border-emerald-300/60 hover:bg-emerald-400/10"
                    >
                      <Icon fontSize="small" />
                      <span className="truncate">{label}</span>
                    </button>
                  ))}
                </div>
              </Section>
            </>
          )}

          {tab === "keys" && (
            <Section title="Key bindings">
              <p className="pb-2 text-xs text-white/45">
                {isTouch
                  ? "These apply when a keyboard is attached. Tap + then press a key; tap a key to remove it."
                  : "Press + then any key to add it. Click a key to remove it. Esc cancels."}
              </p>

              {CONTROL_LABELS.map(({ name, label }) => (
                <KeyBindingRow
                  key={name}
                  name={name}
                  label={label}
                  keys={settings.bindings[name]}
                  capturing={capturing === name}
                  onStartCapture={setCapturing}
                  onRemove={(control, key) =>
                    setBinding(
                      control,
                      settings.bindings[control].filter((item) => item !== key),
                    )
                  }
                />
              ))}
            </Section>
          )}

          {tab === "session" && (
            <Section title="This session">
              {isFullscreenSupported() ? (
                <Toggle
                  label="Fullscreen"
                  hint="Also locks a phone to landscape where the browser allows it"
                  value={isFullscreen}
                  onChange={toggleFullscreen}
                />
              ) : (
                <p className="py-2 text-xs text-white/45">
                  This browser does not expose the Fullscreen API — on iPhone,
                  add the page to your home screen for a fullscreen window.
                </p>
              )}

              {exploring && (
                <DangerButton
                  label="Exit to orbit view"
                  onPress={() => {
                    close();
                    stopExploring();
                  }}
                />
              )}

              <DangerButton
                label="Reset all settings"
                onPress={() => {
                  resetSettings();
                  setCapturing(null);
                }}
              />
            </Section>
          )}
        </div>
      </aside>
    </div>
  );
};

export default SettingsPanel;
