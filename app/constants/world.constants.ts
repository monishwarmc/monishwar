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
 * The deck is a disc of radius `DECK.radius` — about 25 metres across — with
 * the fountain at the middle and six exhibits around it. Keeping them in one
 * list is what makes it possible to see at a glance that nothing overlaps,
 * which is not obvious from six separate component files.
 *
 * Laid out by **bearing**, like a compass rose, because that is how the
 * arrangement is actually reasoned about: the visitor spawns at the south and
 * turns to find things. 0 is +Z (south, behind the spawn mark), and bearings
 * run clockwise.
 *
 *            180  skill tree
 *      122 certs           243  time portal
 *       60 keynote stage   300  contact uplink
 *          350  about hologram   330  controls kiosk
 *
 * Nothing may reach past `DECK.radius` (1.742) or it stands through the glass,
 * and ideally nothing past `DECK.walkRadius` (1.638) or you cannot get behind
 * it. `pnpm layout` does the arithmetic — run it after moving anything here.
 * An earlier arrangement had three exhibits outside the dome and two inside
 * each other, and no screenshot made that obvious.
 */
const station = (bearing: number, distance: number) => {
  const angle = (bearing * Math.PI) / 180;
  const x = Math.sin(angle) * distance;
  const z = Math.cos(angle) * distance;

  return {
    position: [x, GROUND_Y, z] as [number, number, number],
    /** Turned to look at the middle of the deck, where people walk in from. */
    facing: Math.atan2(-x, -z),
    bearing,
    distance,
  };
};

/** The skill tree. Pulled in from the rim so the canopy clears the glass. */
export const TREE_STATION = station(180, 0.85);

/** The circus stage. The largest thing on the deck after the tree. */
export const PROJECTS_STATION = station(60, 0.9);

/** The certificate mast. */
export const CERTS_STATION = station(120, 1.1);

/** The hologram that introduces him. */
export const ABOUT_STATION = station(350, 1.22);

/**
 * The time portal: where he has worked and studied.
 *
 * Two career cards either side of a short, connected timeline. `PORTAL_SPAN`
 * defines the floor marker; `PORTAL_RIG` carries each card's shared geometry
 * into the visual, collision and layout code.
 */
export const PORTAL_SPAN = 10.4;

/**
 * The two career records sit on a shared timeline instead of separate arches.
 * Kept here because their footprints and stand heights are shared with the
 * physics colliders and layout check.
 */
export const PORTAL_RIG = {
  panel: { width: 4.6, height: 5.8, depth: 0.16, support: 0.7 },
  sideOffset: 2.8,
  forwardOffset: 1.15,
} as const;

export const PORTAL_STATION = station(243, 1.2);

/** The uplink: how to reach him. */
export const CONTACT_STATION = station(295, 1.0);

/** The controls kiosk, near the spawn mark but out of the sight line. */
export const BOARD_POSITION = station(330, 0.78).position;
export const BOARD_FACING = station(330, 0.78).facing;


/**
 * The circus ring you can climb onto, in metres.
 *
 * Shared because the stage draws it and `WorldColliders` makes it solid, and
 * the two must agree to the millimetre or the avatar stands in mid-air or
 * sinks into the boards.
 *
 * `height` is the number that matters. The avatar's jump reaches about a
 * third of its own height — `jumpPower` 0.23 against `gravity` 0.71, so
 * v²/2g — and the ring has to stay under that or it is scenery rather than
 * somewhere to climb.
 */
export const STAGE_DECK = {
  /** Half-extents of the riser, matching STAGE_RIG.riser. */
  halfWidth: 8.5,
  halfDepth: 5,
  height: 0.42,
} as const;

/**
 * The keynote stage's rig, in metres.
 *
 * The screen size here is load-bearing twice over: the panel is built from
 * it, and the embedded page is scaled by `metres(width) / pixels`, which is
 * what pins the DOM exactly onto the quad instead of letting it float in
 * front at a size of its own.
 */
/**
 * The certificate cutout, in metres.
 *
 * Deliberately enormous. A certificate is a dense document — small print,
 * a seal, a signature — and at the banner scale this replaced, the only
 * legible thing on it was the border. At this size the board *is* the
 * certificate rather than a picture mounted on one.
 */
/**
 * The certificate hoarding, in metres.
 *
 * Two poles with a screen slung between them. Sized against the *dome*, not
 * just the floor: at 16 metres out the glass is only about 19.5 metres high,
 * and the cutout this replaced stood 24 metres and went through the roof.
 * `pnpm layout` checks both now.
 */
export const CERTS_RIG = {
  pole: { height: 15, radius: 0.42 },
  screen: { width: 11.4, height: 8 },
  gantry: { span: 14 },
} as const;

export const STAGE_RIG = {
  riser: { width: 17, depth: 10 },
  screen: { width: 13.3, height: 7.6, lift: 1.3, bezel: 0.5 },
  truss: { height: 12.4, span: 16 },
} as const;

/** Kept for the tree's own module, which was written against this name. */
export const TREE_POSITION = TREE_STATION.position;


/**
 * The sofa, up on the stage itself.
 *
 * It sat on the grass in front of the riser and ended up half-buried in the
 * steps — the one place on the deck where the ground is not flat. Putting it
 * *on* the boards solves that and reads better anyway: seating on a stage,
 * facing the screen, rather than furniture abandoned on a lawn.
 *
 * `y` is the deck height, so it stands on the riser rather than through it.
 */
export const SOFA_POSITION: [number, number, number] = [
  station(60, 0.78).position[0],
  GROUND_Y + metres(STAGE_DECK.height),
  station(60, 0.78).position[2],
];

/** Turned to face the screen, which is further out along the same bearing. */
export const SOFA_FACING = station(60, 0.78).facing + Math.PI;

/* ------------------------------------------------------------- the paving */

/**
 * WHERE THE GRASS DOES NOT GROW.
 *
 * Anything with a floor — the stage riser, the uplink's apron, the hologram
 * pad, the portal's walkway — stands on the deck rather than hovering over
 * it, and grass is scattered across the whole deck. The blades are taller
 * than the riser is high, so without this they grow straight up through the
 * boards: the single most "not real" thing in the scene, because every other
 * surface behaves.
 *
 * It lives here rather than in `GrassField` because these are the same
 * footprints the colliders and the layout check are built from, and three
 * copies of a station's size would drift apart the first time one changed.
 */
type Paving =
  | { kind: "disc"; x: number; z: number; radius: number }
  | {
      kind: "slab";
      x: number;
      z: number;
      facing: number;
      halfWidth: number;
      halfDepth: number;
    };

const PAVING: Paving[] = [
  {
    kind: "slab",
    x: PROJECTS_STATION.position[0],
    z: PROJECTS_STATION.position[2],
    facing: PROJECTS_STATION.facing,
    halfWidth: metres(STAGE_DECK.halfWidth),
    halfDepth: metres(STAGE_DECK.halfDepth),
  },
  {
    kind: "disc",
    x: CONTACT_STATION.position[0],
    z: CONTACT_STATION.position[2],
    radius: metres(6),
  },
  {
    kind: "disc",
    x: ABOUT_STATION.position[0],
    z: ABOUT_STATION.position[2],
    radius: metres(3.4),
  },
  {
    kind: "slab",
    x: PORTAL_STATION.position[0],
    z: PORTAL_STATION.position[2],
    facing: PORTAL_STATION.facing,
    halfWidth: metres(PORTAL_SPAN / 2),
    halfDepth: metres(1.3),
  },
];

/** True where a blade of grass would be standing on something built. */
export const isPaved = (x: number, z: number) =>
  PAVING.some((area) => {
    if (area.kind === "disc") {
      return Math.hypot(x - area.x, z - area.z) < area.radius;
    }

    // Into the slab's own frame, then a plain box test.
    const dx = x - area.x;
    const dz = z - area.z;
    const cos = Math.cos(area.facing);
    const sin = Math.sin(area.facing);

    return (
      Math.abs(dx * cos - dz * sin) < area.halfWidth &&
      Math.abs(dx * sin + dz * cos) < area.halfDepth
    );
  });
