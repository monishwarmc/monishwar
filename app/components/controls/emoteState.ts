/**
 * Whether the avatar is mid-emote.
 *
 * An emote is a whole-body clip that replaces the walk cycle, so playing one
 * while the legs are still being driven produced the bug this exists to fix:
 * the avatar slid across the grass in a standing pose. The rule now is the one
 * every shooter uses — an emote roots you, and moving cancels it.
 */
let active = false;

const listeners = new Set<() => void>();
const notify = () => listeners.forEach((listener) => listener());

export const startEmote = () => {
  if (active) return;
  active = true;
  notify();
};

export const clearEmote = () => {
  if (!active) return;
  active = false;
  notify();
};

export const isEmoting = () => active;

export const subscribeEmote = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
