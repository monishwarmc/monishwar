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

/**
 * The spaceship group's own scale, as `Spaceship` draws it.
 *
 * Shared because the deck measurements below are in model units and have to be
 * brought into world units by the same number the model is drawn at.
 */
export const SHIP_SCALE = 0.07;

/**
 * The grass disc, measured out of `portfolio_world.glb`.
 *
 * The `ground` node is a 32-vertex `Circle`: perfectly flat, every vertex at
 * y 0.420069, out to a radius of 24.891167 model units.
 *
 * These are written down rather than measured from the GLB at runtime, which
 * is what the character controller used to do. Two things follow. The physics
 * colliders can exist before the model has finished downloading, so there is
 * no frame where the avatar has nothing to stand on; and the numbers are
 * reviewable here next to everything else that depends on them, instead of
 * being a bounding sphere computed in a frame callback.
 */
export const DECK = {
  /** World radius of the grass. */
  radius: 26.891167 * SHIP_SCALE,
  /** World height of the grass surface. */
  surfaceY: 0.420069 * SHIP_SCALE,
  /**
   * Where the wall around the rim stands.
   *
   * Inside the lip rather than on it, so the avatar is stopped while it still
   * has grass under both feet instead of hanging over the edge of the glass.
   */
  get walkRadius() {
    return this.radius * 0.94;
  },
} as const;

/**
 * The avatar's collision capsule.
 *
 * A capsule rather than the circle the old obstacle test used, because the
 * rounded ends are what let the character controller step the avatar over the
 * lip of the fountain and the footing of the control board instead of stopping
 * dead against them.
 */
export const AVATAR_BODY = {
  /** The model is 1.77 model-units tall and one model unit is one metre. */
  height: 1.77 * AVATAR_SCALE,
  /** Half-width, carried over from the old obstacle test. */
  radius: 0.012 * SCALE,
  /** Half the *cylindrical* part, which is what Rapier's capsule wants. */
  get halfHeight() {
    return this.height / 2 - this.radius;
  },
} as const;

/* ------------------------------------------------------------------ props */

/**
 * Where the props stand on the deck.
 *
 * These moved out of the components that draw them because the physics
 * colliders need the same numbers, and the colliders cannot live inside those
 * components: the whole world group bobs while the intro camera is up, so
 * anything mounted under it would bake that bob into its collider. The
 * colliders therefore sit outside the drifting group, and these constants are
 * what keeps the two in the same place.
 *
 * `FACING` turns each prop to look at the middle of the deck, which is where
 * people walk in from.
 */
const facing = (position: readonly [number, number, number]) =>
  Math.atan2(-position[0], -position[2]);

/**
 * Off to one side of the spawn rather than in front of it, so the board is
 * something you notice and walk over to instead of something planted in your
 * view.
 */
export const BOARD_POSITION = [-0.95, GROUND_Y, 0.25] as const;
export const BOARD_FACING = facing(BOARD_POSITION);

export const SOFA_POSITION = [0.4, GROUND_Y, 0.52] as const;
export const SOFA_FACING = facing(SOFA_POSITION);

/**
 * How much bigger the control board is than the size it was drawn at.
 *
 * It is the one object in the world whose whole job is to be legible from a
 * distance, and at its original 1.9 x 1.35m panel it had to be walked up to
 * before the rows resolved — which defeats the point of a sign. At 1.65 the
 * panel is 3.1 x 2.2m and the top edge stands about four metres off the grass,
 * better than twice the avatar's height, and the rows can be read from the
 * middle of the deck.
 *
 * One number rather than a redrawn set, because everything on the board is
 * proportional to everything else: the border, the corner brackets, the drift
 * of the motes and the lettering are all multiplied by this too. Changing the
 * measurements individually is how a sign ends up as a billboard with
 * pinstripes around it.
 */
export const BOARD_SCALE = 1.65;

/**
 * The control board, in metres. The panel hinges back from the top of its
 * posts.
 */
export const BOARD = {
  footing: {
    width: 2.1 * BOARD_SCALE,
    height: 0.16 * BOARD_SCALE,
    depth: 0.75 * BOARD_SCALE,
  },
  /** Height of the posts the panel leans on. */
  postHeight: 0.95 * BOARD_SCALE,
  postThickness: 0.14 * BOARD_SCALE,
  panel: {
    width: 1.9 * BOARD_SCALE,
    height: 1.35 * BOARD_SCALE,
    thickness: 0.08 * BOARD_SCALE,
  },
  /** How far the panel leans back, in radians. Not a length; not scaled. */
  tilt: 0.26,
  /** Total height off the grass, which is what the collider is sized from. */
  get totalHeight() {
    return this.footing.height / 2 + this.postHeight + this.panel.height;
  },
} as const;

/** Half the sofa's width once fitted, which is what the avatar bumps into. */
export const SOFA_HALF_WIDTH = metres(SOFA_MODEL.halfWidth * SOFA_FIT);

/* ------------------------------------------------------------------- tree */

/**
 * The tree, measured out of `tree.glb`.
 *
 *   footprint   x -4.34 .. 4.11,  z -5.46 .. 3.38
 *   ground      y -0.06
 *   crown       y  7.33
 *   lowest leaf y  2.42
 *   trunk base  centred on x -0.04, z -1.00
 *
 * The trunk is recorded separately from the bounding box on purpose. The
 * canopy spreads unevenly, so its box centre is not the trunk — planting the
 * tree by its box would bury the trunk a metre off the spot it is meant to
 * stand on.
 */
export const TREE_MODEL = {
  ground: -0.0615,
  crown: 7.3338,
  lowestLeaf: 2.42,
  /** Centre of the trunk's footprint — the point that gets planted. */
  trunk: { x: -0.04, z: -1.0 },
  /** Half the canopy's spread, for scattering falling leaves under it. */
  canopyRadius: 4.2,
} as const;

/** How tall the tree stands, in metres. Nearly eight times the avatar. */
export const TREE_HEIGHT = 14;

/** Metres of tree per model unit — the scale that makes it TREE_HEIGHT tall. */
export const TREE_FIT = TREE_HEIGHT / (TREE_MODEL.crown - TREE_MODEL.ground);

/* --------------------------------------------------------------- stations */

/**
 * WHERE EVERY BIG THING STANDS ON THE DECK.
 *
 * The deck is a disc of radius `DECK.radius` — about 25 metres across — and
 * these are the exhibits arranged around it. Keeping them in one list is what
 * makes it possible to see at a glance that nothing overlaps anything else,
 * which is not obvious from four separate component files.
 *
 * Positions are world units, as [x, z]. `facing` turns each one to look at the
 * middle of the deck, because that is where people walk in from.
 *
 * Clearances, so the next thing added here has something to check against:
 *
 *   fountain     centre, 0.09 radius
 *   tree         canopy reaches 0.55, so it cannot stand past 1.08 from centre
 *   control board 0.12 half-width, sofa 0.04
 *
 * Nothing may reach past `DECK.radius` (1.742) or it stands through the glass,
 * and ideally nothing past `DECK.walkRadius` (1.638) or you cannot get behind
 * it. The first arrangement of these four had three of them outside the dome
 * and two overlapping each other, which no screenshot made obvious — a wall
 * seen edge-on through a tree looks much like a wall.
 *
 * `scripts/check-layout.mjs` does the arithmetic. Run it after moving anything
 * here; it is faster and more reliable than walking the deck looking for it.
 */
const station = (x: number, z: number) => ({
  position: [x, GROUND_Y, z] as [number, number, number],
  facing: Math.atan2(-x, -z),
  /** Distance from the middle of the deck, for the clearance notes above. */
  reach: Math.hypot(x, z),
});

/** The skill tree. Kept well inside the rim so the canopy clears the glass. */
export const TREE_STATION = station(-0.55, -0.5);

/** The project gallery: a wide arc you walk along. */
export const PROJECTS_STATION = station(1.05, 0.05);

/** The certificate carousel. */
export const CERTS_STATION = station(0.45, -1.1);

/** Experience, education, languages and contact. */
export const PROFILE_STATION = station(-0.3, 1.0);

/** Kept for the tree's own module, which was written against this name. */
export const TREE_POSITION = TREE_STATION.position;
