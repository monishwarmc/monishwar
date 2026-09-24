"use client";

import { KeyboardControls, useKeyboardControls } from "@react-three/drei";
import {
  useEffect,
  useRef,
  useState,
  TouchEvent as ReactTouchEvent,
} from "react";
import FullScreen from "./components/UI/FullScreen";
import UIcontrols from "./components/UI/UIcontrols";
import Scene from "./components/scene/Scene";

const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "w", "W"] },
  { name: "backward", keys: ["ArrowDown", "s", "S"] },
  { name: "left", keys: ["ArrowLeft", "a", "A"] },
  { name: "right", keys: ["ArrowRight", "d", "D"] },
  { name: "run", keys: ["r", "R"] },
];

interface CustomStore {
  api: {
    setState: (state: Record<string, boolean>) => void;
  };
}

export default function Page() {
  return (
    <div className="relative m-0 h-dvh w-dvw overflow-hidden select-none touch-none bg-zinc-900">
      <KeyboardControls map={keyboardMap}>
        <UIcontrols />
        <FullScreen />
        <Scene />
        <MobileUIOverlay />
      </KeyboardControls>
    </div>
  );
}

/* =========================================================================
   ON-SCREEN MOBILE JOYSTICK & CONTROLLER OVERLAY (Fully Verified)
   ========================================================================= */
function MobileUIOverlay() {
  // Use the native, destructured array variables from Drei
  const [, get] = useKeyboardControls();
  const [joystickActive, setJoystickActive] = useState(false);
  const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });
  const touchStart = useRef({ x: 0, y: 0 });

  const handleJoystickStart = (e: ReactTouchEvent<HTMLDivElement>) => {
    e.stopPropagation(); // Blocks camera/OrbitControls from turning
    const touch = e.touches[0];
    if (!touch) return;
    setJoystickActive(true);
    touchStart.current = { x: touch.clientX, y: touch.clientY };
  };

  const handleJoystickMove = (e: ReactTouchEvent<HTMLDivElement>) => {
    if (!joystickActive) return;
    e.stopPropagation();

    const touch = e.touches[0];
    if (!touch) return;

    const deltaX = touch.clientX - touchStart.current.x;
    const deltaY = touch.clientY - touchStart.current.y;

    const maxRadius = 40;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    let knobX = deltaX;
    let knobY = deltaY;

    if (distance > maxRadius) {
      knobX = (deltaX / distance) * maxRadius;
      knobY = (deltaY / distance) * maxRadius;
    }

    setKnobPos({ x: knobX, y: knobY });

    const threshold = 12;

    // Fetch the reactive store mapping context directly
    const currentControls = get() as unknown as Record<string, boolean>;

    // Direct cross-platform reactive mutation boundary mapping
    if (currentControls) {
      currentControls.forward = knobY < -threshold;
      currentControls.backward = knobY > threshold;
      currentControls.left = knobX < -threshold;
      currentControls.right = knobX > threshold;
    }
  };

  const handleJoystickEnd = (e: ReactTouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    setJoystickActive(false);
    setKnobPos({ x: 0, y: 0 });

    const currentControls = get() as unknown as Record<string, boolean>;
    if (currentControls) {
      currentControls.forward = false;
      currentControls.backward = false;
      currentControls.left = false;
      currentControls.right = false;
    }
  };

  const triggerRunAction = () => {
    const currentControls = get() as unknown as Record<string, boolean>;
    if (!currentControls) return;

    // Direct state flash to mimic sequential physical keyboard press loops
    currentControls.run = true;
    setTimeout(() => {
      currentControls.run = false;
    }, 50);
  };

  return (
    <div className="absolute inset-0 pointer-events-none z-50 flex items-end justify-between p-8 md:hidden">
      {/* JOYSTICK CONTROLLER TRACKPAD */}
      <div
        className="w-28 h-28 bg-white/10 border-2 border-white/20 rounded-full flex items-center justify-center pointer-events-auto active:scale-105 transition-transform"
        onTouchStart={handleJoystickStart}
        onTouchMove={handleJoystickMove}
        onTouchEnd={handleJoystickEnd}
      >
        {/* PHYSICAL HANDLE KNOB */}
        <div
          className="w-12 h-12 bg-white rounded-full shadow-lg transition-transform duration-75 will-change-transform"
          style={{ transform: `translate(${knobPos.x}px, ${knobPos.y}px)` }}
        />
      </div>

      {/* NATIVE INTERACTIVE ACTION BUTTON */}
      <button
        onTouchStart={(e) => {
          e.stopPropagation(); // Eradicates canvas panning conflicts
          triggerRunAction();
        }}
        className="w-16 h-16 bg-blue-600 active:bg-red-700 text-white rounded-full font-bold shadow-xl border border-red-500 pointer-events-auto flex items-center justify-center tracking-wider text-xs active:scale-95 transition-all select-none uppercase mr-10"
      >
        Run
      </button>
    </div>
  );
}
