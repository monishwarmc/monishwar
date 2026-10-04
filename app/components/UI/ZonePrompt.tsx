"use client";

import { describeKey } from "@/app/constants/controls.constants";
import { useIsTouch } from "../hooks/useIsTouch";
import { useSettings } from "../settings/settings";
import { tapFeedback } from "../settings/settings";
import { toggleNearestZone, useZoneState } from "../world/zoneState";
import { zoneById } from "../world/zones";

/**
 * The approach prompt.
 *
 * On a phone it is a real button, because there is no key to press; on a
 * pointer device it shows the actual bound key, so a rebind is reflected here
 * too. It sits above the stick and clear of the action cluster either way.
 */
const ZonePrompt = () => {
  const { nearest, focused } = useZoneState();
  const { bindings, hudOpacity } = useSettings();
  const isTouch = useIsTouch();

  if (!nearest || focused) return null;

  const zone = zoneById(nearest);
  const key = bindings.interact?.[0];

  return (
    <div
      style={{ opacity: hudOpacity }}
      className="pointer-events-none absolute bottom-[22%] left-1/2 z-20 -translate-x-1/2"
    >
      <button
        type="button"
        onClick={() => {
          tapFeedback();
          toggleNearestZone();
        }}
        className="pointer-events-auto flex touch-none items-center gap-2.5 rounded-full border px-4 py-2.5 backdrop-blur-sm transition-transform duration-200 active:scale-95"
        style={{
          borderColor: zone.accent,
          backgroundColor: "rgba(4, 8, 12, 0.72)",
        }}
      >
        {isTouch ? (
          <span
            className="flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-bold text-black"
            style={{ backgroundColor: zone.accent }}
          >
            ↗
          </span>
        ) : (
          <kbd
            className="rounded border px-2 py-0.5 font-mono text-[11px] uppercase"
            style={{ borderColor: zone.accent, color: zone.accent }}
          >
            {key ? describeKey(key) : "E"}
          </kbd>
        )}

        <span className="text-sm text-white">
          Read <span className="font-semibold">{zone.title}</span>
        </span>
      </button>
    </div>
  );
};

export default ZonePrompt;
