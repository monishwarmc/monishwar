"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Physics } from "@react-three/rapier";
import { Suspense } from "react";
import { AVATAR_SCALE } from "@/app/constants/world.constants";
import { useSession } from "../contexts/SessionContext";
import { QUALITY_PIXEL_RATIO, useSettings } from "../settings/settings";
import WorldColliders from "../physics/WorldColliders";
import Camera from "./Camera";
import CharacterController from "./CharacterController";
import HeadTracking from "./HeadTracking";
import Light from "./Light";
import RenderGovernor from "./RenderGovernor";
import World from "./World";

/**
 * Real gravity, in world units.
 *
 * The scene is a miniature — a 1.77m person stands AVATAR_SCALE units tall —
 * so 9.81 m/s² has to be scaled by the same number to fall at the right rate.
 */
const GRAVITY: [number, number, number] = [0, -9.81 * AVATAR_SCALE, 0];

const Experience = () => {
  const { quality, showBackground, fieldOfView } = useSettings();
  const { exploring } = useSession();

  return (
    <Canvas
      // Phones often report a device pixel ratio of 3+; capping it keeps the
      // frame rate playable without a visible loss of sharpness. The player
      // can lower this further from the settings panel.
      dpr={[1, QUALITY_PIXEL_RATIO[quality]]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
      // The certificate wall crops its slides to the cut-out with clipping
      // planes on their materials, and three.js ignores those unless local
      // clipping is switched on for the renderer.
      onCreated={({ gl }) => {
        gl.localClippingEnabled = true;
      }}
    >
      {/*
        Declared rather than configured through `Canvas camera={...}` so the
        field-of-view slider flows in as a prop. Mutating `camera.fov` from an
        effect would work too, but r3f already owns applying it and calling
        `updateProjectionMatrix`. No position here on purpose — whichever rig
        is mounted places the camera, so a re-render cannot yank it back.
      */}
      <PerspectiveCamera makeDefault fov={fieldOfView} near={0.01} far={200} />
      <RenderGovernor />

      <Suspense fallback={null}>
        <Environment files="/textures/space.hdr" background={showBackground} />
        <Light />

        {/*
          Nothing in this scene is dynamic — the only body that moves is the
          avatar's, and it is kinematic — so a step costs almost nothing. It is
          still paused outside explore mode, because outside explore mode
          nothing asks the physics world a question.

          `updatePriority={-1}` is what guarantees the world has been stepped
          before the character controller reads it. r3f sorts frame callbacks
          by priority and only treats a *positive* one as taking over
          rendering, so a negative value buys the ordering without disturbing
          RenderGovernor, which owns the render at priority 1.

          `lengthUnit` tells Rapier how big a metre is here, which is what its
          internal tolerances are written against. Leaving it at 1 would have
          the engine treating an entire 25-metre deck as a one-metre object and
          resolving contacts far too coarsely for an avatar 0.12 units tall.
        */}
        <Physics
          paused={!exploring}
          timeStep="vary"
          gravity={GRAVITY}
          lengthUnit={AVATAR_SCALE}
          updatePriority={-1}
          debug
        >
          <WorldColliders />
          {/* Inside Physics so the follow camera can ask it what is in the
              way before it pulls back into a wall. */}
          <Camera />
          <World />
          <CharacterController />
        </Physics>

        <HeadTracking />
      </Suspense>
    </Canvas>
  );
};

export default Experience;
