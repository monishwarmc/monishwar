"use client";

import { describeKey } from "@/app/constants/controls.constants";
import { press } from "../audio/sfx";
import { useIsTouch } from "../hooks/useIsTouch";
import { useSettings } from "../settings/settings";
import {
  getInteractable,
  toggleNearest,
  useInteractionState,
} from "../world/interactables";

/**
 * "Press E to sit" — the prompt that appears when the avatar is standing in
 * front of something it can use.
 *
 * On a phone it is a real button, because there is no key to press; on a
 * pointer device it shows the actual bound key, so a rebind is reflected here
 * too. It sits above the stick and clear of the action cluster either way.
 */
const InteractPrompt = () => {
  const { nearest, engaged } = useInteractionState();
  const { bindings, hudOpacity } = useSettings();
  const isTouch = useIsTouch();

  const id = engaged ?? nearest;
  if (!id) return null;

  const item = getInteractable(id);
  if (!item) return null;

  const key = bindings.interact?.[0];
  const using = engaged === id;

  return (
    <div
      style={{ opacity: hudOpacity }}
      className="pointer-events-none absolute bottom-[24%] left-1/2 z-20 -translate-x-1/2"
    >
      <button
        type="button"
        onClick={() => {
          press();
          toggleNearest();
        }}
        className="pointer-events-auto flex touch-none items-center gap-2.5 rounded-full border border-emerald-300/80 bg-black/70 px-4 py-2.5 backdrop-blur-sm transition-transform duration-200 active:scale-95"
      >
        {isTouch ? (
          <span className="flex h-6 w-6 items-center justify-center rounded-full bg-emerald-300 text-[11px] font-bold text-black">
            {using ? "×" : "↗"}
          </span>
        ) : (
          <kbd className="rounded border border-emerald-300/80 px-2 py-0.5 font-mono text-[11px] uppercase text-emerald-200">
            {key ? describeKey(key) : "E"}
          </kbd>
        )}

        <span className="text-sm text-white">
          {using ? "Stand up" : item.verb}{" "}
          <span className="font-semibold">{using ? "" : item.label}</span>
        </span>
      </button>
    </div>
  );
};

export default InteractPrompt;
