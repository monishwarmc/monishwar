"use client";

import Image from "next/image";

import CloseIcon from "@mui/icons-material/Close";
import { useState } from "react";
import {
  CONTROL_LABELS,
  ControlName,
  describeKey,
} from "@/app/constants/controls.constants";
import { useSession } from "../contexts/SessionContext";
import { useIsTouch } from "../hooks/useIsTouch";
import { updateSettings, useSettings } from "../settings/settings";
import { CONTROL_ICONS } from "./emotes";

const TOUCH_ROWS: { icon: string | null; title: string; body: string }[] = [
  {
    icon: null,
    title: "Stick — bottom left",
    body: "Press anywhere in the lower-left corner; the stick appears under your thumb. Push to walk.",
  },
  {
    icon: CONTROL_ICONS.run,
    title: "Run",
    body: "Tap once and the avatar runs on its own. Steer by dragging the view. Touching the stick drops back to a walk.",
  },
  {
    icon: CONTROL_ICONS.jump,
    title: "Jump",
    body: "Tap to hop. Works while moving.",
  },
  {
    icon: null,
    title: "Look — drag anywhere",
    body: "Drag on open screen to orbit the camera. Pinch with two fingers to pull it closer or further.",
  },
  {
    icon: null,
    title: "Emote",
    body: "Opens a ring of poses. Picking one stops the avatar; moving again cancels it.",
  },
];

const KEY_ROWS: { controls: ControlName[]; title: string; body: string }[] = [
  {
    controls: ["forward", "left", "backward", "right"],
    title: "Move",
    body: "Walk around the deck.",
  },
  { controls: ["run"], title: "Sprint", body: "Hold while moving." },
  {
    controls: ["autoRun"],
    title: "Auto-run",
    body: "Runs on its own until you steer.",
  },
  { controls: ["jump"], title: "Jump", body: "Hop over anything low." },
  {
    controls: ["emote"],
    title: "Emote wheel",
    body: "Pick a pose from the ring.",
  },
  {
    controls: ["settings"],
    title: "Settings",
    body: "Every control is tunable.",
  },
  {
    controls: ["fullscreen"],
    title: "Fullscreen",
    body: "Also locks a phone to landscape.",
  },
  {
    controls: ["exit"],
    title: "Back out",
    body: "Closes a panel, then leaves explore mode.",
  },
];

/**
 * The control guide, shown once when explore mode first opens.
 *
 * It is device-aware rather than a single sheet of both schemes: a phone
 * player has no use for a key table, and a desktop player has no stick. The
 * keyboard half reads the live bindings, so a rebound key is correct here too.
 */
const HelpOverlay = () => {
  const { overlay, setOverlay } = useSession();
  const { bindings, showHelpOnStart } = useSettings();
  const isTouch = useIsTouch();

  const [dontShow, setDontShow] = useState(!showHelpOnStart);

  if (overlay !== "help") return null;

  const close = () => {
    updateSettings({ showHelpOnStart: !dontShow });
    setOverlay("none");
  };

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
      onClick={(event) => {
        if (event.target === event.currentTarget) close();
      }}
    >
      <div className="flex max-h-full w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-white/15 bg-[#0b0f14]">
        <header className="flex items-start justify-between gap-4 border-b border-white/10 px-5 py-4">
          <div>
            <h2 className="text-lg font-semibold text-white">
              How to move around
            </h2>
            <p className="text-xs text-white/50">
              {isTouch ? "Touch controls" : "Keyboard and mouse"} · reopen any
              time from settings
            </p>
          </div>
          <button
            type="button"
            aria-label="Close help"
            onClick={close}
            className="rounded-full p-2 text-white/70 hover:bg-white/10 hover:text-white"
          >
            <CloseIcon fontSize="small" />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-3">
          {isTouch
            ? TOUCH_ROWS.map(({ icon, title, body }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 border-b border-white/5 py-3 last:border-b-0"
                >
                  {icon ? (
                    <Image
                      src={icon}
                      alt=""
                      width={128}
                      height={128}
                      unoptimized
                      className="h-10 w-10 shrink-0 rounded-full border border-white/30"
                    />
                  ) : (
                    <span className="h-10 w-10 shrink-0 rounded-full border border-dashed border-white/25" />
                  )}
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">
                      {title}
                    </span>
                    <span className="block text-xs leading-relaxed text-white/55">
                      {body}
                    </span>
                  </span>
                </div>
              ))
            : KEY_ROWS.map(({ controls, title, body }) => (
                <div
                  key={title}
                  className="flex items-start gap-3 border-b border-white/5 py-2.5 last:border-b-0"
                >
                  <span className="flex w-28 shrink-0 flex-wrap gap-1 pt-0.5">
                    {controls
                      .map((name) => bindings[name]?.[0])
                      .filter(Boolean)
                      .map((key) => (
                        <kbd
                          key={key}
                          className="min-w-[1.6rem] rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-center font-mono text-[10px] uppercase text-white/85"
                        >
                          {describeKey(key)}
                        </kbd>
                      ))}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-sm font-medium text-white">
                      {title}
                    </span>
                    <span className="block text-xs text-white/55">{body}</span>
                  </span>
                </div>
              ))}

          {!isTouch && (
            <p className="py-3 text-xs text-white/55">
              <span className="font-medium text-white">Drag</span> anywhere on
              the scene to orbit the camera, and{" "}
              <span className="font-medium text-white">scroll</span> to pull it
              closer or further away.
            </p>
          )}

          <p className="pb-2 pt-1 text-xs text-white/40">
            Walk up to any of the {CONTROL_LABELS.length > 0 ? "six" : "six"}{" "}
            stations around the deck to open them.
          </p>
        </div>

        <footer className="flex items-center justify-between gap-4 border-t border-white/10 px-5 py-3">
          <label className="flex cursor-pointer items-center gap-2 text-xs text-white/55">
            <input
              type="checkbox"
              checked={dontShow}
              onChange={(event) => setDontShow(event.target.checked)}
              className="h-4 w-4 accent-emerald-400"
            />
            Don&apos;t show this again
          </label>

          <button
            type="button"
            onClick={close}
            className="rounded-full bg-emerald-400 px-5 py-2 text-sm font-semibold text-black transition-transform active:scale-95"
          >
            Got it
          </button>
        </footer>
      </div>
    </div>
  );
};

export default HelpOverlay;
