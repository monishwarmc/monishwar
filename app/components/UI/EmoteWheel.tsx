"use client";

import Image from "next/image";

import CloseIcon from "@mui/icons-material/Close";
import { useEffect, useState } from "react";
import { startEmote } from "../controls/emoteState";
import { setAutoRun } from "../controls/inputState";
import { useSession } from "../contexts/SessionContext";
import { ActionName, useMonishwar } from "../contexts/MonishwarContext";
import { tapFeedback, useSettings } from "../settings/settings";
import { EMOTES } from "./emotes";

/**
 * Free Fire style emote wheel: the choices sit on a ring you flick a thumb
 * towards, instead of a list you have to read top to bottom.
 *
 * The ring radius is derived from the smaller viewport axis so it stays inside
 * a 390px-tall landscape phone and still looks deliberate on a desktop canvas.
 */
const EmoteWheel = () => {
  const { overlay, setOverlay } = useSession();
  const { setAnimation } = useMonishwar();
  const { hudOpacity } = useSettings();

  const [radius, setRadius] = useState(118);
  const [hovered, setHovered] = useState<string | null>(null);

  const open = overlay === "emotes";

  useEffect(() => {
    const measure = () => {
      const shortEdge = Math.min(window.innerWidth, window.innerHeight);
      // Keep the ring and its buttons clear of the screen edges.
      setRadius(Math.max(76, Math.min(150, shortEdge * 0.29)));
    };

    measure();
    window.addEventListener("resize", measure);
    window.addEventListener("orientationchange", measure);

    return () => {
      window.removeEventListener("resize", measure);
      window.removeEventListener("orientationchange", measure);
    };
  }, []);

  if (!open) return null;

  const pick = (action: ActionName) => {
    tapFeedback();
    // An emote roots the avatar, so it cannot sit on top of an auto-run.
    setAutoRun(false);
    startEmote();
    setAnimation(action);
    setOverlay("none");
  };

  const buttonSize = radius < 100 ? 54 : 66;

  return (
    <div
      className="pointer-events-auto absolute inset-0 z-40 flex items-center justify-center bg-black/45 backdrop-blur-[3px]"
      style={{ opacity: hudOpacity }}
      onClick={(event) => {
        // Only a click on the backdrop itself closes the wheel.
        if (event.target === event.currentTarget) setOverlay("none");
      }}
    >
      <div
        className="relative"
        style={{
          height: radius * 2 + buttonSize,
          width: radius * 2 + buttonSize,
        }}
      >
        <span
          className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full border border-dashed border-white/20"
          style={{ height: radius * 2, width: radius * 2 }}
        />

        {EMOTES.map(({ action, label, icon }, index) => {
          // Start at the top, go clockwise.
          const angle = (index / EMOTES.length) * Math.PI * 2 - Math.PI / 2;
          const x = Math.cos(angle) * radius;
          const y = Math.sin(angle) * radius;
          const isHovered = hovered === action;

          return (
            <button
              key={action}
              type="button"
              aria-label={label}
              onPointerEnter={() => setHovered(action)}
              onPointerLeave={() => setHovered(null)}
              onClick={() => pick(action)}
              style={{
                height: buttonSize,
                width: buttonSize,
                left: "50%",
                top: "50%",
                transform: `translate(calc(-50% + ${x}px), calc(-50% + ${y}px))`,
              }}
              className={`absolute touch-none rounded-full border-2 transition-transform duration-150 active:scale-90 ${
                isHovered
                  ? "scale-110 border-emerald-300 shadow-[0_0_20px_rgba(52,211,153,0.6)]"
                  : "border-white/60"
              }`}
            >
              <Image
                src={icon}
                alt=""
                width={128}
                height={128}
                unoptimized
                className="h-full w-full rounded-full object-cover"
              />
              <span className="pointer-events-none absolute -bottom-5 left-1/2 w-20 -translate-x-1/2 text-center text-[10px] font-semibold text-white drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                {label}
              </span>
            </button>
          );
        })}

        <button
          type="button"
          aria-label="Close emotes"
          onClick={() => {
            tapFeedback();
            setOverlay("none");
          }}
          style={{ height: buttonSize, width: buttonSize }}
          className="absolute left-1/2 top-1/2 flex -translate-x-1/2 -translate-y-1/2 touch-none items-center justify-center rounded-full border border-white/40 bg-black/70 text-white/80 transition-transform active:scale-90"
        >
          <CloseIcon fontSize="small" />
        </button>
      </div>
    </div>
  );
};

export default EmoteWheel;
