"use client";

import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";
import { useMemo } from "react";
import {
  AVATAR_BODY,
  BOARD,
  CERTS_STATION,
  BOARD_FACING,
  BOARD_POSITION,
  DECK,
  FOUNTAIN,
  GROUND_Y,
  metres,
  SOFA_FACING,
  SOFA_HALF_WIDTH,
  SOFA_POSITION,
  TREE_STATION,
} from "@/app/constants/world.constants";

/**
 * EVERYTHING SOLID IN THE WORLD, IN ONE LIST.
 *
 * This replaces `controls/obstacles.ts`, which kept a registry of circles and
 * pushed the avatar out of them by hand every frame. Rapier does the same job
 * properly — it slides along a surface rather than snapping to the nearest
 * point outside it, it steps over low edges, and it does the whole thing in
 * WASM against a broad phase instead of in a JavaScript loop.
 *
 * ## Why the colliders are here and not in the components that draw the props
 *
 * Because the world drifts. `scene/World.tsx` bobs the entire world group
 * while the intro camera is up, and @react-three/rapier reads an object's
 * *world* matrix when it creates a collider. A collider mounted under the
 * drifting group would therefore be baked at whatever offset the bob happened
 * to be at that instant — up to 0.06 world units, which is half the avatar's
 * height.
 *
 * So the colliders sit outside that group, at the positions the props are
 * authored at. The physics world is, in effect, the drifting group's *local*
 * space: a prop's authored position is its position in both. The character
 * controller works in the same space (the avatar is a child of that group, so
 * its `position` already is), which means the bob simply never enters the
 * physics at all, and nothing has to be converted either way.
 *
 * ## Shapes
 *
 * ## Every collider here carries an explicit `key`
 *
 * @react-three/rapier builds its effect dependencies as
 * `[...mutablePropsAsFlatArray, getCollider]` — a *flattened* list of whatever
 * props you passed. Two colliders of the same type therefore end up with deps
 * arrays of different lengths if one takes a `rotation` and the other does not.
 *
 * Add a collider to the middle of an unkeyed list and React matches it
 * positionally against whatever used to be in that slot, reuses its hooks, and
 * the deps array changes size between renders — which React refuses, with an
 * error pointing at the new collider rather than at the pair that collided.
 * Keys make the matching explicit and retire the whole class of problem.
 *
 * Primitives throughout, no trimeshes. Every solid thing here is either a
 * column or a box, and the one piece of real geometry — the grass — is a flat
 * 32-vertex disc that a cylinder describes exactly. A trimesh of the grass
 * would be slower to query and no more accurate.
 */

/** How far the grass collider extends below its surface. Depth is free. */
const FLOOR_THICKNESS = 0.2;

/**
 * How high the wall around the rim stands.
 *
 * It has to beat a jump, or the avatar can hop over the edge of its own
 * world. The jump arc tops out at about a third of the avatar's height, so
 * twice its height is a wide margin and costs nothing.
 */
const RIM_HEIGHT = AVATAR_BODY.height * 2;

/** Sides in the wall around the rim. */
const RIM_SEGMENTS = 32;

/**
 * The invisible wall that keeps the avatar on the grass.
 *
 * Rapier has no hollow-cylinder primitive, so the rim is approximated by a
 * ring of flat panels — the same way a circle is drawn. 32 of them put the
 * worst-case bulge between two panels at under 1% of the radius, which is
 * nothing against a disc 25 metres across, and each one is a box the broad
 * phase can reject instantly.
 *
 * It is a wall rather than the circular clamp the controller used to apply
 * because a clamp stops you dead at the edge. Walking into a wall at an angle
 * slides you along it, which is what every other solid thing in the scene
 * does, and the rim should not be the exception.
 */
const useRimPanels = () =>
  useMemo(() => {
    // Inscribe the panels so the playable area is never *larger* than the
    // margin allows: a chord sits inside the circle it is drawn on.
    const radius = DECK.walkRadius;
    const halfWidth = radius * Math.tan(Math.PI / RIM_SEGMENTS);

    return Array.from({ length: RIM_SEGMENTS }, (_, index) => {
      const angle = (index / RIM_SEGMENTS) * Math.PI * 2;

      return {
        key: index,
        position: [
          Math.sin(angle) * radius,
          DECK.surfaceY + RIM_HEIGHT / 2,
          Math.cos(angle) * radius,
        ] as [number, number, number],
        rotation: [0, angle, 0] as [number, number, number],
        halfWidth,
      };
    });
  }, []);

const WorldColliders = () => {
  const rim = useRimPanels();

  return (
    <RigidBody type="fixed" colliders={false}>
      {/* The grass. A cylinder whose top face is the walking surface. */}
      <CylinderCollider
        key="solid-1"
        args={[FLOOR_THICKNESS / 2, DECK.radius]}
        position={[0, DECK.surfaceY - FLOOR_THICKNESS / 2, 0]}
      />

      {rim.map(({ key, position, rotation, halfWidth }) => (
        <CuboidCollider
          key={key}
          args={[halfWidth, RIM_HEIGHT / 2, 0.01]}
          position={position}
          rotation={rotation}
        />
      ))}

      {/* The fountain basin, at the centre of the deck. */}
      <CylinderCollider
        key="solid-2"
        args={[AVATAR_BODY.height / 8, FOUNTAIN.collision]}
        position={[0, GROUND_Y + AVATAR_BODY.height / 8, 0]}
      />
      <CylinderCollider
        key="solid-3"
        args={[AVATAR_BODY.height / 8, 0.06]}
        position={[0, GROUND_Y + AVATAR_BODY.height / 1.9, 0]}
      />

      {/*
        The control board. A box on the footing's footprint, run up the full
        height of the sign so nobody jumps onto the panel and stands on it.
      */}
      <CuboidCollider
        key="solid-4"
        args={[
          metres(BOARD.footing.width / 2),
          metres(BOARD.totalHeight / 2),
          metres(BOARD.footing.depth / 2),
        ]}
        position={[
          BOARD_POSITION[0],
          BOARD_POSITION[1] + metres(BOARD.totalHeight / 2),
          BOARD_POSITION[2],
        ]}
        rotation={[0, BOARD_FACING, 0]}
      />

      {/*
        The certificate wall. A slab, so it is solid across its whole frontage
        rather than only at the middle — you should be able to walk along it.
      */}
      <CuboidCollider
        key="solid-5"
        args={[metres(6.5), metres(4), metres(0.6)]}
        position={[
          CERTS_STATION.position[0],
          GROUND_Y + metres(4),
          CERTS_STATION.position[2],
        ]}
        rotation={[0, CERTS_STATION.facing, 0]}
      />

      {/*
        The tree trunk. Only the trunk — the canopy is eight metres across and
        starts well above head height, so a collider that matched the model
        would be a wall around a tree you are meant to walk under.
      */}
      <CylinderCollider
        key="solid-6"
        args={[AVATAR_BODY.height, metres(1.5)]}
        position={[
          TREE_STATION.position[0],
          GROUND_Y + AVATAR_BODY.height,
          TREE_STATION.position[2],
        ]}
      />

      {/*
        The sofa. Still a column rather than a box, and still at 80% of the
        sofa's width — the seat the avatar has to reach is only just in front
        of the cushion, and a collider on the true footprint would hold it
        back from the one spot it needs to stand on to sit down.
      */}
      <CylinderCollider
        key="solid-7"
        args={[AVATAR_BODY.height / 6, SOFA_HALF_WIDTH * 0.8]}
        position={[
          SOFA_POSITION[0],
          SOFA_POSITION[1] + AVATAR_BODY.height / 6,
          SOFA_POSITION[2],
        ]}
        rotation={[0, SOFA_FACING, 0]}
      />
    </RigidBody>
  );
};

export default WorldColliders;
