/**
 * Baseline tuning for the character controller and the third-person camera.
 *
 * Everything here is expressed in *world* units. The scene is a miniature: the
 * spaceship group is scaled to 0.07 and the avatar to 0.03, so the grass disc
 * has a world radius of ~1.74 and the character stands ~0.05 units tall. Speeds
 * therefore look tiny but map to believable metres per second once the 0.03
 * character scale is divided out (walk ~1.8 m/s, run ~4.5 m/s).
 *
 * These are the *defaults*. Anything a player can change lives in
 * `components/settings/settings.ts`, which seeds itself from this file.
 */

/** Every rebindable action. Order drives the key list in the settings panel. */
export const DEFAULT_BINDINGS = {
  forward: ["ArrowUp", "w", "W"],
  backward: ["ArrowDown", "s", "S"],
  left: ["ArrowLeft", "a", "A"],
  right: ["ArrowRight", "d", "D"],
  run: ["Shift"],
  autoRun: ["r", "R"],
  jump: [" "],
  emote: ["e", "E"],
  settings: ["o", "O"],
  fullscreen: ["f", "F"],
  exit: ["Escape"],
} as const satisfies Record<string, readonly string[]>;

export type ControlName = keyof typeof DEFAULT_BINDINGS;

export type Bindings = Record<ControlName, string[]>;

/** Human labels for the settings panel, in the order they should be listed. */
export const CONTROL_LABELS: { name: ControlName; label: string }[] = [
  { name: "forward", label: "Move forward" },
  { name: "backward", label: "Move back" },
  { name: "left", label: "Move left" },
  { name: "right", label: "Move right" },
  { name: "run", label: "Sprint (hold)" },
  { name: "autoRun", label: "Auto-run" },
  { name: "jump", label: "Jump" },
  { name: "emote", label: "Emote wheel" },
  { name: "settings", label: "Settings" },
  { name: "fullscreen", label: "Fullscreen" },
  { name: "exit", label: "Leave explore mode" },
];

export const createDefaultBindings = (): Bindings =>
  Object.fromEntries(
    Object.entries(DEFAULT_BINDINGS).map(([name, keys]) => [name, [...keys]]),
  ) as Bindings;

/** `event.key` is unreadable for a few keys; the panel shows these instead. */
export const KEY_LABELS: Record<string, string> = {
  " ": "Space",
  ArrowUp: "↑",
  ArrowDown: "↓",
  ArrowLeft: "←",
  ArrowRight: "→",
  Escape: "Esc",
  Control: "Ctrl",
};

export const describeKey = (key: string) => KEY_LABELS[key] ?? key.toUpperCase();

export const MOVEMENT = {
  walkSpeed: 0.055,
  runSpeed: 0.135,
  /** Higher = snappier start/stop. Used as an exponential damping rate. */
  acceleration: 10,
  /** Radians per second the avatar turns toward its heading. */
  turnRate: 10,
  jumpVelocity: 0.13,
  gravity: 0.4,
  /**
   * The avatar's inner group sits 0.03 above its outer group (see Monishwar),
   * so the outer group has to be pushed down by this much for the feet to land
   * exactly on the ground hit point.
   */
  feetOffset: 0.03,
  /** Keep the avatar off the very lip of the grass disc. */
  edgeMargin: 0.94,
  /** Below this world speed the avatar is considered standing still. */
  idleThreshold: 0.004,
  /** Above this fraction of runSpeed the run animation takes over. */
  runAnimationRatio: 0.72,
  /** Set to Math.PI if the avatar ever ends up walking backwards. */
  modelFacingOffset: 0,
} as const;

export const FOLLOW_CAMERA = {
  distance: 0.16,
  minDistance: 0.08,
  maxDistance: 0.55,
  /** Height above the feet that the camera aims at — roughly the shoulders. */
  lookHeight: 0.034,
  minPitch: -0.3,
  maxPitch: 1.15,
  /** Radians of yaw per pixel dragged. */
  lookSensitivity: 0.005,
  /** Thumbs travel shorter distances than a mouse, so touch deltas get a boost. */
  touchLookGain: 1.4,
  /** Exponential damping rates — higher is tighter. */
  positionLambda: 9,
  targetLambda: 14,
  /** Never let the camera sink into the grass. */
  groundClearance: 0.012,
  fieldOfView: 69,
} as const;
