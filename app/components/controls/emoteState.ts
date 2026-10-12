/**
 * Whether the avatar is mid-emote.
 *
 * An emote is a whole-body clip that replaces the walk cycle, so playing one
 * while the legs are still being driven produced the bug this exists to fix:
 * the avatar slid across the grass in a standing pose. The rule now is the one
 * every shooter uses — an emote roots you, and moving cancels it.
 */
let active = false;

export const startEmote = () => {
  active = true;
};

export const clearEmote = () => {
  active = false;
};

export const isEmoting = () => active;
