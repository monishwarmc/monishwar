"use client";

import { useEffect, useState } from "react";
import { ControlName, describeKey } from "@/app/constants/controls.constants";
import { useSettings } from "../settings/settings";

const HINTS: { controls: ControlName[]; label: string; literal?: string[] }[] = [
  { controls: ["forward", "left", "backward", "right"], label: "move" },
  { controls: ["autoRun"], label: "auto-run" },
  { controls: ["run"], label: "sprint" },
  { controls: ["jump"], label: "jump" },
  { controls: ["emote"], label: "emotes" },
  { controls: [], label: "orbit", literal: ["Drag"] },
  { controls: ["settings"], label: "settings" },
];

/**
 * Desktop legend. It reads the player's own bindings, so a rebound key shows
 * up here, and it fades out once they have clearly got the idea.
 */
const KeyHints = () => {
  const { bindings, showKeyHints, hudOpacity } = useSettings();
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const dismiss = () => setVisible(false);
    const timer = window.setTimeout(dismiss, 12000);

    window.addEventListener("keydown", dismiss, { once: true });

    return () => {
      window.clearTimeout(timer);
      window.removeEventListener("keydown", dismiss);
    };
  }, []);

  if (!visible || !showKeyHints) return null;

  return (
    <div
      style={{ opacity: hudOpacity }}
      className="pointer-events-none absolute bottom-5 left-5 z-20 hidden flex-col gap-1.5 rounded-xl border border-white/15 bg-black/45 px-3.5 py-3 text-white/80 backdrop-blur-sm transition-opacity duration-500 sm:flex"
    >
      {HINTS.map(({ controls, label, literal }) => {
        // Only the first key of each action, or the legend turns into a wall.
        const keys = literal ?? controls.map((name) => bindings[name]?.[0] ?? "");

        return (
          <div key={label} className="flex items-center gap-2 text-xs">
            <span className="flex gap-1">
              {keys.filter(Boolean).map((key) => (
                <kbd
                  key={key}
                  className="min-w-[1.5rem] rounded border border-white/30 bg-white/10 px-1.5 py-0.5 text-center font-mono text-[10px] uppercase"
                >
                  {literal ? key : describeKey(key)}
                </kbd>
              ))}
            </span>
            <span className="opacity-70">{label}</span>
          </div>
        );
      })}
    </div>
  );
};

export default KeyHints;
