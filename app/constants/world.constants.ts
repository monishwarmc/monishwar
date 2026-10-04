/**
 * ONE PLACE TO RETUNE THE WORLD.
 *
 * Everything inside the dome is sized against the avatar. If the scene ever
 * feels too small or too large, change `AVATAR_SCALE` and the rest follows —
 * speeds, camera distance, the fountain and every station are all derived from
 * it below rather than hard-coded.
 *
 * Reference numbers, so the maths is checkable:
 *   - the avatar model is 1.74 model-units tall (a 1.74m person)
 *   - at AVATAR_SCALE 0.045 that is 0.078 world units
 *   - so 1 world unit ≈ 22 metres
 *   - the grass disc has a world radius of 1.74, i.e. a ~38m plaza
 */

/** The master dial. Raise it to make the avatar (and the world) bigger. */
export const AVATAR_SCALE = 0.045;

/**
 * How much bigger everything is than the first pass, which read as a doll's
 * house. Sizes written against the old 0.03 avatar are multiplied by this.
 */
export const SCALE = AVATAR_SCALE / 0.03;

/** Height of the grass surface. Fixed by the spaceship model, not by scale. */
export const GROUND_Y = 0.03;

/** Usable radius of the deck, matching the controller's edge clamp. */
export const DECK_RADIUS = 1.6;

export const FOUNTAIN = {
  scale: 0.03 * SCALE,
  /** Outer lip of the basin, in model units, before scaling. */
  modelRadius: 1.86,
  get collision() {
    return this.modelRadius * this.scale * 0.92;
  },
};

/** Distance from the centre of the deck out to the ring of stations. */
export const RING_RADIUS = 1.15;

/** Multiplier applied to every station's geometry. */
export const STATION_SCALE = SCALE;

/**
 * Screens (the project TV and the certification tablet) are measured in CSS
 * pixels so the HTML embedded in them stays crisp, then shrunk into world
 * space by this factor.
 *
 * worldWidth = pixelWidth * PIXELS_TO_WORLD
 */
export const PIXELS_TO_WORLD = 0.00042;
