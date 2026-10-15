"use client";

import {
  CuboidCollider,
  CylinderCollider,
  RigidBody,
} from "@react-three/rapier";
import { useMemo } from "react";
import {
  ABOUT_STATION,
  AVATAR_BODY,
  BOARD,
  CERTS_STATION,
  CONTACT_STATION,
  PORTAL_RIG,
  PORTAL_STATION,
  PROJECTS_STATION,
  BOARD_FACING,
  BOARD_POSITION,
  DECK,
  FOUNTAIN,
  GROUND_Y,
  metres,
  SOFA_FACING,
  SOFA_HALF_WIDTH,
  SOFA_POSITION,
  CERTS_RIG,
  STAGE_RIG,
  STAGE_DECK,
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
        key="fountain"
        args={[AVATAR_BODY.height / 8, FOUNTAIN.collision]}
        position={[0, GROUND_Y + AVATAR_BODY.height / 8, 0]}
      />

      {/* The control board. A box on the footing's footprint, run up the full
          height of the sign so nobody jumps onto the panel and stands on it. */}
      <CuboidCollider
        key="board"
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
        The tree trunk. Only the trunk — the canopy is sixteen metres across
        and starts well above head height, so a collider matching the model
        would be a wall around a tree you are meant to walk under.
      */}
      <CylinderCollider
        key="tree"
        args={[AVATAR_BODY.height, metres(1.5)]}
        position={[
          TREE_STATION.position[0],
          GROUND_Y + AVATAR_BODY.height,
          TREE_STATION.position[2],
        ]}
      />

      {/*
        THE STAGE RISER — the one collider here you are meant to stand on.

        A box whose top face is the stage deck. It is deliberately low: the
        avatar's jump tops out around a third of its own height, so a taller
        riser would be scenery rather than somewhere to climb. Rapier's
        autostep carries it up without a jump if it walks straight at the
        steps, which is what the steps are for.
      */}
      <CuboidCollider
        key="stage"
        args={[
          metres(STAGE_DECK.halfWidth),
          metres(STAGE_DECK.height / 2),
          metres(STAGE_DECK.halfDepth),
        ]}
        position={[
          PROJECTS_STATION.position[0],
          GROUND_Y + metres(STAGE_DECK.height / 2),
          PROJECTS_STATION.position[2],
        ]}
        rotation={[0, PROJECTS_STATION.facing, 0]}
      />

      {/*
        The steps up to the stage.

        One wedge rather than three treads: the character controller's
        autostep carries the avatar over anything under a third of its height,
        so what it needs underfoot is a continuous ramp of collision, not
        three separate lips to catch on. Without this the steps were decoration
        and the only way onto the riser was a jump at its edge.
      */}
      <CuboidCollider
        key="stage-steps"
        args={[metres(3.75), metres(STAGE_DECK.height / 2), metres(1.1)]}
        position={[
          PROJECTS_STATION.position[0] +
            Math.sin(PROJECTS_STATION.facing) *
              metres(STAGE_DECK.halfDepth + 1),
          GROUND_Y + metres(STAGE_DECK.height / 2),
          PROJECTS_STATION.position[2] +
            Math.cos(PROJECTS_STATION.facing) *
              metres(STAGE_DECK.halfDepth + 1),
        ]}
        rotation={[0, PROJECTS_STATION.facing, 0]}
      />

      {/*
        The LED wall. Solid, so nobody walks through the screen — and so the
        camera cannot end up behind it looking at the back of the panel.
      */}
      <CuboidCollider
        key="screen"
        args={[
          metres(STAGE_RIG.screen.width / 2),
          metres(STAGE_RIG.screen.height / 2),
          metres(0.5),
        ]}
        position={[
          PROJECTS_STATION.position[0] -
            Math.sin(PROJECTS_STATION.facing) *
              metres(STAGE_RIG.riser.depth / 2 - 0.6),
          GROUND_Y +
            metres(
              STAGE_DECK.height +
                STAGE_RIG.screen.lift +
                STAGE_RIG.screen.height / 2,
            ),
          PROJECTS_STATION.position[2] -
            Math.cos(PROJECTS_STATION.facing) *
              metres(STAGE_RIG.riser.depth / 2 - 0.6),
        ]}
        rotation={[0, PROJECTS_STATION.facing, 0]}
      />

      {/* The certificate cutout. Solid across its whole frontage, so you
          walk round it rather than through it, and the camera cannot end up
          behind the board. */}
      {/* The two poles. Only the poles are solid — you should be able to
          walk under the screen, which hangs well above head height. */}
      {[-1, 1].map((side) => (
        <CylinderCollider
          key={`cert-pole-${side}`}
          args={[AVATAR_BODY.height, metres(CERTS_RIG.pole.radius * 2.6)]}
          position={[
            CERTS_STATION.position[0] +
              Math.cos(CERTS_STATION.facing) * side * metres(CERTS_RIG.screen.width * 0.56),
            GROUND_Y + AVATAR_BODY.height,
            CERTS_STATION.position[2] -
              Math.sin(CERTS_STATION.facing) * side * metres(CERTS_RIG.screen.width * 0.56),
          ]}
        />
      ))}

      {/* The hologram's emitter pad. The light above it is not solid —
          walking into a projection should not stop you. */}
      <CylinderCollider
        key="hologram"
        args={[metres(0.3), metres(3.4)]}
        position={[
          ABOUT_STATION.position[0],
          GROUND_Y + metres(0.3),
          ABOUT_STATION.position[2],
        ]}
      />

      {/* The two raised career cards and their narrow supports. */}
      {[-1, 1].map((side) => (
        <CuboidCollider
          key={`portal-${side}`}
          args={[
            metres(PORTAL_RIG.panel.width / 2),
            metres((PORTAL_RIG.panel.height + PORTAL_RIG.panel.support) / 2),
            metres(0.2),
          ]}
          position={[
            PORTAL_STATION.position[0] +
              Math.cos(PORTAL_STATION.facing) * side * metres(PORTAL_RIG.sideOffset) +
              Math.sin(PORTAL_STATION.facing) * metres(PORTAL_RIG.forwardOffset),
            GROUND_Y +
              metres((PORTAL_RIG.panel.height + PORTAL_RIG.panel.support) / 2),
            PORTAL_STATION.position[2] -
              Math.sin(PORTAL_STATION.facing) * side * metres(PORTAL_RIG.sideOffset) +
              Math.cos(PORTAL_STATION.facing) * metres(PORTAL_RIG.forwardOffset),
          ]}
          rotation={[0, PORTAL_STATION.facing, 0]}
        />
      ))}

      {/* The contact desk's base; its signal rings stay clear overhead. */}
      <CylinderCollider
        key="uplink"
        args={[AVATAR_BODY.height, metres(1.9)]}
        position={[
          CONTACT_STATION.position[0],
          GROUND_Y + AVATAR_BODY.height,
          CONTACT_STATION.position[2],
        ]}
      />

      {/*
        The sofa. A column rather than a box, and at 80% of the sofa's width —
        the seat the avatar has to reach is only just in front of the cushion,
        and a collider on the true footprint would hold it back from the one
        spot it needs to stand on to sit down.
      */}
      <CylinderCollider
        key="sofa"
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
