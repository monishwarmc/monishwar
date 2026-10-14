/**
 * ONE PLACE TO RETUNE THE WORLD.
 *
 * Everything inside the dome is sized against the avatar. If the scene ever
 * feels too small or too large, change `AVATAR_SCALE` and the rest follows —
 * speeds, camera distance, the fountain and every station are all derived from
 * it below rather than hard-coded.
 *
 * Reference numbers, so the maths is checkable:
 *   - the avatar model is 1.77 model-units tall (a 1.77m person), so one
 *     model unit is one metre
 *   - at AVATAR_SCALE 0.069 it stands 0.12 world units tall
 *   - so 1 world unit ≈ 14.5 metres
 *   - the grass disc has a world radius of 1.6, i.e. a ~23m plaza
 */

/** The master dial. Raise it to make the avatar (and the world) bigger. */
export const AVATAR_SCALE = 0.069;

/**
 * How much bigger everything is than the first pass, which read as a doll's
 * house. Sizes written against the old 0.03 avatar are multiplied by this.
 */
export const SCALE = AVATAR_SCALE / 0.039;

/** Height of the grass surface. Fixed by the spaceship model, not by scale. */
export const GROUND_Y = 0.03;

/**
 * Converts real-world metres into world units.
 *
 * The avatar model is 1.77 model-units tall and stands 1.77m, so one model
 * unit *is* one metre, and drawing it at AVATAR_SCALE makes one metre exactly
 * AVATAR_SCALE world units. Sizing props in metres then means a sofa stays
 * sofa-sized when the master dial changes.
 *
 * This used to divide by 1.74 as well, on the reasoning that the model is
 * 1.74 units tall — which is the same number arrived at twice, not two
 * different numbers. Everything measured in metres therefore came out 1.74
 * times too small, which is why the sofa the avatar was supposed to sit on
 * was knee-high.
 */
export const metres = (value: number) => value * AVATAR_SCALE;

export const FOUNTAIN = {
  scale: 0.03 * SCALE,
  /** Outer lip of the basin, in model units, before scaling. */
  modelRadius: 1.86,
  get collision() {
    return this.modelRadius * this.scale * 0.96;
  },
  /**
   * How far the water carries at full volume, in world units.
   *
   * Beyond this the panner rolls it off, so it is a murmur from the rim of the
   * deck (1.6 out) and loud with your feet in the basin.
   */
  audioRefDistance: 0.0001,
};

/**
 * The sofa, measured out of `sofa.glb`. One model unit is one metre, and the
 * model's backrest faces -Z.
 *
 *   footprint   x -1.444 .. 1.444,  z -1.033 .. 1.170
 *   underside   y -0.775            (the black plinth)
 *   top of back y  1.135
 *   cushion     y  0.52,  centred at z 0.25
 *
 * The numbers are measured rather than eyeballed because the avatar's sitting
 * clip is not negotiable: it parks the hips 0.465m above the floor and 0.403m
 * behind the root, and leaves the root standing on the ground. So the cushion
 * has to arrive just under 0.465m or the avatar floats above it or sinks
 * through it, and that one requirement fixes the whole sofa's size.
 */
export const SOFA_MODEL = {
  underside: -0.775,
  cushionY: 0.52,
  cushionZ: 0.25,
  halfWidth: 1.444,
} as const;

export const AVATAR_SIT = {
  /** Height of the hips above the floor at the end of `sitting_on_chair`. */
  hipHeight: 0.465,
  /** How far behind its root the same clip leaves the hips. */
  hipsBehindRoot: 0.403,
  /** Let the avatar settle into the cushion a little, the way a person does. */
  sink: 0.04,
} as const;

/** Metres of sofa per model unit — i.e. the scale that fits it to the avatar. */
export const SOFA_FIT =
  (AVATAR_SIT.hipHeight - AVATAR_SIT.sink) /
  (SOFA_MODEL.cushionY - SOFA_MODEL.underside);

/** Distance from the centre of the deck out to the ring of stations. */
export const RING_RADIUS = 1.15;
