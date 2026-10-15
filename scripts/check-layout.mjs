/**
 * DOES EVERYTHING ON THE DECK ACTUALLY FIT? — `pnpm layout`
 *
 * The deck is a disc about 25 metres across with four large exhibits, a tree,
 * a kiosk, a sofa and a fountain on it. Two failure modes matter and neither is
 * reliably visible in a screenshot:
 *
 *   1. something reaches past the rim and stands through the glass
 *   2. two things occupy the same ground
 *
 * The second is the sneaky one. A wall seen edge-on from across the deck, with
 * a tree in front of it, looks exactly like a wall that is not inside the tree.
 * The first arrangement of the four exhibits had three of them outside the dome
 * and two overlapping, and every screenshot of it looked plausible.
 *
 * So the numbers are checked here instead. Shapes are modelled honestly —
 * a wall is an oriented rectangle, not a disc of its own width, because
 * treating a 13m x 1m wall as a 6.5m circle invents conflicts that do not
 * exist and would push the layout apart for no reason.
 *
 * Keep this in step with `STATIONS` in `app/constants/world.constants.ts`.
 * It deliberately re-states the numbers rather than importing them: this is a
 * check, and a check that derives its expectations from the thing it is
 * checking cannot fail.
 */

const AVATAR_SCALE = 0.069;
const SHIP_SCALE = 0.07;

/** Metres to world units. */
const m = (value) => value * AVATAR_SCALE;

const DECK = {
  radius: 24.891167 * SHIP_SCALE,
  get walkRadius() {
    return this.radius * 0.94;
  },
};

/**
 * The glass dome, measured out of the GLB.
 *
 * `glass_sphere` is a hemisphere of radius 25.029 model units reaching up to
 * y 25.271, with the grass at 0.420 — so about 25.4 metres across the floor
 * and 25.2 metres to the apex.
 *
 * ## Checking height is not optional
 *
 * This check used to test horizontal reach only, and that is how a 24-metre
 * certificate board ended up standing at 17 metres out, where the dome is
 * only 19 metres high. It cleared the rim comfortably and went straight
 * through the roof, and nothing in the arithmetic said a word about it.
 *
 * A dome is the one shape where *standing further in* is what buys you
 * height, so the two constraints pull against each other and neither can be
 * checked alone.
 */
const DOME = {
  radius: (25.029 * SHIP_SCALE) / AVATAR_SCALE,
  apex: ((25.271 - 0.420069) * SHIP_SCALE) / AVATAR_SCALE,
};

/** How high anything may stand at `d` metres from the middle of the deck. */
const headroom = (d) => {
  const inside = DOME.radius ** 2 - d ** 2;
  return inside <= 0 ? 0 : Math.sqrt(inside) * (DOME.apex / DOME.radius);
};

const TREE_FIT = 14 / (7.3338 + 0.0615);
const SOFA_FIT = (0.465 - 0.04) / (0.52 + 0.775);

/**
 * Each thing on the deck, as the shape it actually occupies.
 *
 *   disc   { x, z, r }                     — a column
 *   slab   { x, z, halfWidth, halfDepth }  — a wall, facing the deck centre
 */
const disc = (name, x, z, r, height = 0) => ({
  name,
  kind: "disc",
  x,
  z,
  r,
  height,
});

// Kept for the next wall-shaped exhibit; nothing on the deck is one today.

const slab = (
  name,
  x,
  z,
  halfWidth,
  halfDepth,
  height = 0,
  facing = Math.atan2(-x, -z),
) => ({
  name,
  kind: "slab",
  x,
  z,
  halfWidth,
  halfDepth,
  height,
  // Stations are rotated so their local +Z faces the middle of the deck, so
  // the long axis runs tangentially.
  facing,
});

/**
 * Where each station stands. Keep in step with `STATIONS` in
 * `app/constants/world.constants.ts`.
 *
 * Overridable from the environment so a placement can be searched for
 * without editing the file — `CERTS_B=140 CERTS_D=1.0 pnpm layout`.
 */
const num = (name, fallback) =>
  process.env[name] === undefined ? fallback : Number(process.env[name]);

const STAGE = { bearing: num("STAGE_B", 60), distance: num("STAGE_D", 0.9) };
const CERTS = { bearing: num("CERTS_B", 120), distance: num("CERTS_D", 1.1) };
const ABOUT = { bearing: num("ABOUT_B", 350), distance: num("ABOUT_D", 1.22) };
const PORTAL = {
  bearing: num("PORTAL_B", 243),
  distance: num("PORTAL_D", 1.2),
  span: 10.4,
  sideOffset: 2.8,
  forwardOffset: 1.15,
  panelWidth: 4.6,
  panelDepth: 0.16,
  panelHeight: 5.8,
  support: 0.7,
};
const CONTACT = {
  bearing: num("CONTACT_B", 295),
  distance: num("CONTACT_D", 1.0),
};
const CONTACT_APRON = num("CONTACT_APRON", 6);
const CONTACT_SIGNAL = num("CONTACT_SIGNAL", 8);
const CONTACT_SIGNAL_RADIUS = num("CONTACT_SIGNAL_RADIUS", 2.2);
const STAGE_W = num("STAGE_W", 17);
const STAGE_D = num("STAGE_DEPTH", 10);
const CERTS_W = num("CERTS_W", 14);

/** A station's ground position, from a bearing and a distance. */
const at = (bearing, distance) => {
  const angle = (bearing * Math.PI) / 180;
  return [Math.sin(angle) * distance, Math.cos(angle) * distance];
};

/**
 * Everything on the deck, broken into the parts that actually matter.
 *
 * A station is listed as several shapes where its footprint and its height
 * belong to different bits of it. The uplink is the case that forced this:
 * it is a seven-metre apron with a seventeen-metre tower in the middle, and
 * describing it as one seven-metre-wide, seventeen-metre-tall object put its
 * full height out at the apron's edge — where the dome is low — and reported
 * a roof strike that does not exist.
 *
 * Flat things get a height of 0 and simply never trip the headroom test.
 */
const THINGS = (() => {
  const list = [];

  list.push(disc("fountain", 0, 0, 1.86 * 0.03 * (AVATAR_SCALE / 0.039) * 0.96, 4));

  const board = at(330, 0.78);
  list.push(disc("board", board[0], board[1], m((2.1 * 1.65) / 2), 3.9));

  const sofa = at(60, 0.78);
  list.push(disc("sofa", sofa[0], sofa[1], m(1.444 * SOFA_FIT), 1.2));

  // The canopy, which is what a tall neighbour would collide with.
  const tree = at(180, 0.85);
  list.push(disc("tree", tree[0], tree[1], m(4.2 * TREE_FIT), 14));

  // The riser is wide and flat; the screen wall and truss are the tall part,
  // and they stand at the back of it.
  const stage = at(STAGE.bearing, STAGE.distance);
  const stageFacing = Math.atan2(-stage[0], -stage[1]);
  list.push(slab("stage-riser", stage[0], stage[1], m(STAGE_W / 2), m(STAGE_D / 2), 0.42));
  list.push(
    slab(
      "stage-wall",
      stage[0] - Math.sin(stageFacing) * m(STAGE_D / 2 - 0.6),
      stage[1] - Math.cos(stageFacing) * m(STAGE_D / 2 - 0.6),
      m((STAGE_W - 4) / 2),
      m(1.2),
      12.4,
    ),
  );

  // Two poles and the screen between them.
  const certs = at(CERTS.bearing, CERTS.distance);
  list.push(slab("certificates", certs[0], certs[1], m(CERTS_W / 2), m(1.6), 15));

  // A flat pad, a short pillar, and a cone of light above it.
  const about = at(ABOUT.bearing, ABOUT.distance);
  list.push(disc("about-pad", about[0], about[1], m(3.4), 0.55));
  list.push(disc("about-beam", about[0], about[1], m(4.4), 0.55 + 4.2 + 7.5));

  // Two career cards either side of the timeline, with a shared front face.
  const portal = at(PORTAL.bearing, PORTAL.distance);
  const portalFacing = Math.atan2(-portal[0], -portal[1]);

  for (const side of [-1, 1]) {
    const localX = m(side * PORTAL.sideOffset);
    const localZ = m(PORTAL.forwardOffset);
    list.push(slab(
      `portal${side < 0 ? "-edu" : "-work"}`,
      portal[0] + Math.cos(portalFacing) * localX + Math.sin(portalFacing) * localZ,
      portal[1] - Math.sin(portalFacing) * localX + Math.cos(portalFacing) * localZ,
      m(PORTAL.panelWidth / 2),
      m(PORTAL.panelDepth / 2),
      PORTAL.panelHeight + PORTAL.support,
      portalFacing,
    ));
  }

  // A wide flat apron with a compact signal sculpture and terminal.
  const contact = at(CONTACT.bearing, CONTACT.distance);
  list.push(disc("contact-apron", contact[0], contact[1], m(CONTACT_APRON), 0.1));
  list.push(
    disc(
      "contact-signal",
      contact[0],
      contact[1],
      m(CONTACT_SIGNAL_RADIUS),
      CONTACT_SIGNAL,
    ),
  );

  return list;
})();

/** The furthest any part of a thing gets from the middle of the deck. */
const reach = (thing) => {
  if (thing.kind === "disc") return Math.hypot(thing.x, thing.z) + thing.r;

  // A slab's corners, in world space.
  const centre = Math.hypot(thing.x, thing.z);
  const cos = Math.cos(thing.facing);
  const sin = Math.sin(thing.facing);

  let worst = 0;

  for (const sw of [-1, 1]) {
    for (const sd of [-1, 1]) {
      const lx = sw * thing.halfWidth;
      const lz = sd * thing.halfDepth;
      const x = thing.x + lx * cos + lz * sin;
      const z = thing.z - lx * sin + lz * cos;
      worst = Math.max(worst, Math.hypot(x, z));
    }
  }

  return Math.max(worst, centre);
};

/* ------------------------------------------------------- overlap tests */

/**
 * These are exact, not conservative, and that matters.
 *
 * The first version bounded every slab by a circle through its corners. For a
 * twenty-metre stage meeting a thirteen-metre board at an angle that
 * overstates the conflict badly — it reported three overlaps between things
 * that clear each other comfortably, and the fix would have been to shrink
 * exhibits that were the right size all along. A check that cries wolf gets
 * worked around rather than fixed.
 */

/** A slab's axes and half-extents, in world space. */
const axesOf = (slabShape) => {
  const cos = Math.cos(slabShape.facing);
  const sin = Math.sin(slabShape.facing);

  return [
    { axis: [cos, -sin], half: slabShape.halfWidth },
    { axis: [sin, cos], half: slabShape.halfDepth },
  ];
};

/** Closest point on an oriented rectangle to a point. */
const closestOnSlab = (slabShape, px, pz) => {
  let x = slabShape.x;
  let z = slabShape.z;

  const dx = px - slabShape.x;
  const dz = pz - slabShape.z;

  for (const { axis, half } of axesOf(slabShape)) {
    const distance = Math.max(-half, Math.min(half, dx * axis[0] + dz * axis[1]));
    x += axis[0] * distance;
    z += axis[1] * distance;
  }

  return [x, z];
};

/** Separating-axis test for two oriented rectangles. */
const slabsOverlap = (a, b) => {
  for (const shape of [a, b]) {
    for (const { axis } of axesOf(shape)) {
      const spread = (other) =>
        axesOf(other).reduce(
          (sum, part) =>
            sum + part.half * Math.abs(part.axis[0] * axis[0] + part.axis[1] * axis[1]),
          0,
        );

      const centres = Math.abs(
        (b.x - a.x) * axis[0] + (b.z - a.z) * axis[1],
      );

      if (centres > spread(a) + spread(b)) return 0;
    }
  }

  // Overlapping. Report the shortest centre distance as a rough depth.
  return Math.hypot(a.x - b.x, a.z - b.z);
};

/** How far two things interpenetrate, or 0 if they are clear. */
const overlapOf = (a, b) => {
  if (a.kind === "disc" && b.kind === "disc") {
    const gap = Math.hypot(a.x - b.x, a.z - b.z) - a.r - b.r;
    return gap < 0 ? -gap : 0;
  }

  if (a.kind === "slab" && b.kind === "slab") {
    return slabsOverlap(a, b) > 0 ? 1 : 0;
  }

  const [slabShape, discShape] = a.kind === "slab" ? [a, b] : [b, a];
  const [cx, cz] = closestOnSlab(slabShape, discShape.x, discShape.z);
  const gap = Math.hypot(cx - discShape.x, cz - discShape.z) - discShape.r;

  return gap < 0 ? -gap : 0;
};

let problems = 0;

console.log(
  `\ndeck radius ${DECK.radius.toFixed(3)}   walkable ${DECK.walkRadius.toFixed(3)}\n`,
);

for (const thing of THINGS) {
  const out = reach(thing);

  // Height is checked at the furthest point, because that is where the dome
  // is lowest over the object.
  const limit = headroom(out / AVATAR_SCALE);
  const tall = thing.height > limit;

  const verdict =
    out > DECK.radius
      ? "THROUGH THE GLASS"
      : tall
        ? "THROUGH THE ROOF"
        : out > DECK.walkRadius
          ? "past the rim wall"
          : "ok";

  if (verdict !== "ok") problems++;

  console.log(
    `  ${thing.name.padEnd(13)} reaches ${out.toFixed(3)}` +
      `   height ${thing.height.toFixed(1)}m / ${limit.toFixed(1)}m` +
      `   ${verdict}`,
  );
}

console.log("\noverlaps:");

for (let i = 0; i < THINGS.length; i++) {
  for (let j = i + 1; j < THINGS.length; j++) {
    const a = THINGS[i];
    const b = THINGS[j];
    // Two parts of the same station share ground by construction — the
    // uplink's tower stands on its own apron, the stage's screen on its own
    // riser. Only report conflicts *between* stations.
    const sameStation =
      a.name.split("-")[0] === b.name.split("-")[0];
    const furnitureOnStage =
      (a.name === "sofa" && b.name === "stage-riser") ||
      (b.name === "sofa" && a.name === "stage-riser");

    const depth = sameStation || furnitureOnStage ? 0 : overlapOf(a, b);

    if (depth > 0) {
      problems++;
      console.log(`  ${a.name} / ${b.name}: overlap by ${depth.toFixed(3)}`);
    }
  }
}

if (!problems) console.log("  none\n");

process.exit(problems ? 1 : 0);
