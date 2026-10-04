/**
 * Touch/pointer input shared between the DOM HUD and the r3f render loop.
 *
 * This is a plain mutable singleton rather than React state on purpose: the
 * joystick and the look pad update on every pointer move, and the controller
 * reads them on every frame. Routing that through React would re-render the
 * whole scene 60+ times a second for no benefit.
 */
export const inputState = {
  /** Joystick axes, -1..1. `moveY` is positive when pushing forward. */
  moveX: 0,
  moveY: 0,
  /**
   * Auto-run: the avatar runs forward on its own until the player steers.
   * Toggled by the HUD button or the auto-run key, never held.
   */
  autoRun: false,
  /** Set by the jump button, cleared by `consumeJump`. */
  jumpQueued: false,
  /** Look deltas in pixels, accumulated between frames. */
  lookX: 0,
  lookY: 0,
  /** Pinch/wheel camera distance delta, accumulated between frames. */
  zoomDelta: 0,
  /**
   * True once the current gesture has moved far enough to be a look-drag.
   * 3D buttons check it so releasing a camera drag over a button does not
   * press it.
   */
  dragged: false,
};

/**
 * Auto-run is the one input the HUD has to render, so it gets listeners while
 * the rest stays a plain mutable object. `useSyncExternalStore` subscribes the
 * button, which means the frame loop can switch auto-run off — when the player
 * grabs the stick — and the button lights down to match.
 */
const autoRunListeners = new Set<(value: boolean) => void>();

export const setAutoRun = (value: boolean) => {
  if (inputState.autoRun === value) return;

  inputState.autoRun = value;
  autoRunListeners.forEach((listener) => listener(value));
};

export const getAutoRun = () => inputState.autoRun;

export const subscribeAutoRun = (listener: () => void) => {
  autoRunListeners.add(listener);
  return () => {
    autoRunListeners.delete(listener);
  };
};

export const resetInput = () => {
  inputState.moveX = 0;
  inputState.moveY = 0;
  inputState.jumpQueued = false;
  inputState.lookX = 0;
  inputState.lookY = 0;
  inputState.zoomDelta = 0;
  inputState.dragged = false;
  setAutoRun(false);
};

export const queueJump = () => {
  inputState.jumpQueued = true;
};

/** Set by the controller so the HUD and the scene can react to a landing. */
export const JUMP_SOUND_GAIN = 0.5;

/** Returns true once per queued jump. */
export const consumeJump = () => {
  if (!inputState.jumpQueued) return false;
  inputState.jumpQueued = false;
  return true;
};

const lookScratch = { x: 0, y: 0 };

/** Drains the accumulated look delta. Reuses one object — do not keep it. */
export const consumeLook = () => {
  lookScratch.x = inputState.lookX;
  lookScratch.y = inputState.lookY;
  inputState.lookX = 0;
  inputState.lookY = 0;
  return lookScratch;
};

export const addLook = (dx: number, dy: number) => {
  inputState.lookX += dx;
  inputState.lookY += dy;
};

export const consumeZoom = () => {
  const delta = inputState.zoomDelta;
  inputState.zoomDelta = 0;
  return delta;
};

export const addZoom = (delta: number) => {
  inputState.zoomDelta += delta;
};
