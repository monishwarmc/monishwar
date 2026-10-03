"use client";

import { useRef } from "react";
import { FOLLOW_CAMERA } from "@/app/constants/controls.constants";
import { addLook, addZoom } from "../controls/inputState";

/**
 * Transparent layer that turns a drag anywhere into camera look, plus a
 * two-finger pinch for camera distance.
 *
 * It sits below the stick and the action cluster, so a drag that starts on a
 * control belongs to that control and everything else is a look.
 */
const LookPad = () => {
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const pinchDistance = useRef<number | null>(null);

  const onPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    event.currentTarget.setPointerCapture(event.pointerId);
    pointers.current.set(event.pointerId, {
      x: event.clientX,
      y: event.clientY,
    });
    pinchDistance.current = null;
  };

  const onPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    const previous = pointers.current.get(event.pointerId);
    if (!previous) return;

    const dx = event.clientX - previous.x;
    const dy = event.clientY - previous.y;

    previous.x = event.clientX;
    previous.y = event.clientY;

    if (pointers.current.size >= 2) {
      const [a, b] = Array.from(pointers.current.values());
      const distance = Math.hypot(a.x - b.x, a.y - b.y);

      if (pinchDistance.current !== null) {
        addZoom((pinchDistance.current - distance) * 0.0015);
      }

      pinchDistance.current = distance;
      return;
    }

    addLook(
      dx * FOLLOW_CAMERA.touchLookGain,
      dy * FOLLOW_CAMERA.touchLookGain,
    );
  };

  const onPointerUp = (event: React.PointerEvent<HTMLDivElement>) => {
    pointers.current.delete(event.pointerId);
    if (pointers.current.size < 2) pinchDistance.current = null;
  };

  return (
    <div
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      className="pointer-events-auto absolute inset-0 z-10 touch-none"
    />
  );
};

export default LookPad;
