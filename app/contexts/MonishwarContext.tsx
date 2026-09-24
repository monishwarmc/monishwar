"use client";
import { createContext, ReactNode, useContext, useRef, useState } from "react";
import * as THREE from "three";

export const animations = [
  "waving_hand_gesture(hello)",
  "walking",
  "Stretching_arms",
  "sitting_on_chair",
  "Sitting_down_on_floor_pose",
  "showing_the_background-hand_gesture",
  "saluting_hand_gesture",
  "Sad_disappointed_action",
  "Running",
  "Knee_down_pose",
  "Jumping",
  "fist_pumping_hand-gesture",
  "Fighting_pose",
  "Dismissing_hand_gesture",
  "Dancing",
  "crouch_sitting_pose",
  "breathing_idle_standing",
  "Agreeing",
  "Acknowledging",
];

export type ActionName =
  | "waving_hand_gesture(hello)"
  | "walking"
  | "Stretching_arms"
  | "sitting_on_chair"
  | "Sitting_down_on_floor_pose"
  | "showing_the_background-hand_gesture"
  | "saluting_hand_gesture"
  | "Sad_disappointed_action"
  | "Running"
  | "Knee_down_pose"
  | "Jumping"
  | "fist_pumping_hand-gesture"
  | "Fighting_pose"
  | "Dismissing_hand_gesture"
  | "Dancing"
  | "crouch_sitting_pose"
  | "breathing_idle_standing"
  | "Agreeing"
  | "Acknowledging";

interface MonishwarContextType {
  animation: ActionName | null;
  setAnimation: (name: ActionName) => void;
  ref: React.RefObject<THREE.Group | null>;
}

const MonishwarContext = createContext<MonishwarContextType | undefined>(
  undefined,
);

export const MonishwarProvider = ({ children }: { children: ReactNode }) => {
  const [animation, setAnimation] = useState<ActionName>(
    "breathing_idle_standing",
  );
  const ref = useRef<THREE.Group>(null);

  return (
    <MonishwarContext.Provider
      value={{
        animation,
        setAnimation,
        ref,
      }}
    >
      {children}
    </MonishwarContext.Provider>
  );
};

export const useMonishwar = (): MonishwarContextType => {
  const context = useContext(MonishwarContext);
  if (!context) {
    throw new Error("useMonishwar must be used within MonishwarProvider");
  }
  return context;
};
