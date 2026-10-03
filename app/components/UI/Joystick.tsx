"use client";

import { useCallback, useEffect, useRef } from "react";
import { inputState } from "../controls/inputState";
import { useSettings } from "../settings/settings";

/** Ignore the first few pixels so a resting thumb does not creep forward. */
const DEAD_ZONE = 0.14;
const BASE_SIZE = 136;
const KNOB_SIZE = 58;
/** Knob travel, which is also the divisor that normalises the axes to -1..1. */
const TRAVEL = 52;

/**
 * Free Fire style movement stick.
 *
 * By default it floats: the base re-seats under the thumb wherever it lands,
 * so the player never has to find a fixed circle while watching the action.
 * Settings can pin it in place for anyone who prefers a fixed stick.
 */
const Joystick = () => {
  const { stickScale, floatingStick, mirrorHud, hudOpacity } = useSettings();

  const zoneRef = useRef<HTMLDivElement>(null);
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const activePointer = useRef<number | null>(null);
  const center = useRef({ x: 0, y: 0 });

  const travel = TRAVEL * stickScale;

  const drawKnob = useCallback((dx: number, dy: number) => {
    // Tailwind v4 compiles `-translate-x-1/2` to the standalone `translate`
    // property, which would compose with an inline transform instead of being
    // replaced by it. Keeping all stick offsets inline avoids that stacking.
    if (knobRef.current) {
      knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
    }
  }, []);

  const apply = useCallback(
    (clientX: number, clientY: number) => {
      let dx = clientX - center.current.x;
      let dy = clientY - center.current.y;

      const distance = Math.hypot(dx, dy);

      if (distance > travel) {
        dx = (dx / distance) * travel;
        dy = (dy / distance) * travel;
      }

      drawKnob(dx, dy);

      const nx = dx / travel;
      const ny = dy / travel;
      const magnitude = Math.hypot(nx, ny);

      if (magnitude < DEAD_ZONE) {
        inputState.moveX = 0;
        inputState.moveY = 0;
        return;
      }

      // Rescale past the dead zone so the stick still reaches full tilt.
      const scale = (magnitude - DEAD_ZONE) / (1 - DEAD_ZONE) / magnitude;

      inputState.moveX = nx * scale;
      inputState.moveY = -ny * scale; // screen-up is forward
    },
    [drawKnob, travel],
  );

  const release = useCallback(() => {
    activePointer.current = null;
    inputState.moveX = 0;
    inputState.moveY = 0;
    drawKnob(0, 0);

    if (baseRef.current) {
      baseRef.current.style.opacity = "0.55";
      baseRef.current.style.transform = "translate(-50%, -50%) scale(0.9)";
    }
  }, [drawKnob]);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== null) return;

    const zone = zoneRef.current;
    const base = baseRef.current;
    if (!zone || !base) return;

    activePointer.current = event.pointerId;
    event.currentTarget.setPointerCapture(event.pointerId);

    if (floatingStick) {
      const bounds = zone.getBoundingClientRect();
      base.style.left = `${event.clientX - bounds.left}px`;
      base.style.top = `${event.clientY - bounds.top}px`;
      center.current = { x: event.clientX, y: event.clientY };
    } else {
      const bounds = base.getBoundingClientRect();
      center.current = {
        x: bounds.left + bounds.width / 2,
        y: bounds.top + bounds.height / 2,
      };
    }

    base.style.opacity = "0.9";
    base.style.transform = "translate(-50%, -50%) scale(1)";

    apply(event.clientX, event.clientY);
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    apply(event.clientX, event.clientY);
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    if (activePointer.current !== event.pointerId) return;
    release();
  };

  // Resizing or rotating the device invalidates the captured centre.
  useEffect(() => release, [release]);

  return (
    <div
      ref={zoneRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ opacity: hudOpacity }}
      className={`pointer-events-auto absolute bottom-0 z-20 h-[58%] w-[46%] touch-none ${
        mirrorHud ? "right-0" : "left-0"
      }`}
    >
      <div
        ref={baseRef}
        style={{
          left: "35%",
          top: "68%",
          height: BASE_SIZE * stickScale,
          width: BASE_SIZE * stickScale,
          opacity: 0.55,
          transform: "translate(-50%, -50%) scale(0.9)",
        }}
        className="absolute rounded-full border-2 border-white/70 bg-black/25 shadow-[0_2px_12px_rgba(0,0,0,0.45)] backdrop-blur-[2px] transition-opacity duration-150"
      >
        <div className="absolute inset-[14px] rounded-full border border-white/30" />
        <div
          ref={knobRef}
          style={{
            height: KNOB_SIZE * stickScale,
            width: KNOB_SIZE * stickScale,
            transform: "translate(-50%, -50%)",
          }}
          className="absolute left-1/2 top-1/2 rounded-full border border-white/80 bg-white/45 shadow-[0_0_18px_rgba(0,0,0,0.5)]"
        />
      </div>
    </div>
  );
};

export default Joystick;
