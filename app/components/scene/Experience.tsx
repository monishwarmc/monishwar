"use client";

import { Canvas } from "@react-three/fiber";
import { Environment, PerspectiveCamera } from "@react-three/drei";
import { Suspense } from "react";
import { QUALITY_PIXEL_RATIO, useSettings } from "../settings/settings";
import Camera from "./Camera";
import CharacterController from "./CharacterController";
import Light from "./Light";
import World from "./World";

const Experience = () => {
  const { quality, showBackground, fieldOfView } = useSettings();

  return (
    <Canvas
      // Phones often report a device pixel ratio of 3+; capping it keeps the
      // frame rate playable without a visible loss of sharpness. The player
      // can lower this further from the settings panel.
      dpr={[1, QUALITY_PIXEL_RATIO[quality]]}
      gl={{ antialias: true, powerPreference: "high-performance" }}
    >
      {/*
        Declared rather than configured through `Canvas camera={...}` so the
        field-of-view slider flows in as a prop. Mutating `camera.fov` from an
        effect would work too, but r3f already owns applying it and calling
        `updateProjectionMatrix`. No position here on purpose — whichever rig
        is mounted places the camera, so a re-render cannot yank it back.
      */}
      <PerspectiveCamera makeDefault fov={fieldOfView} near={0.01} far={200} />

      <Suspense fallback={null}>
        <Environment files="/textures/space.hdr" background={showBackground} />
        <Light />
        <Camera />
        <World />
        <CharacterController />
      </Suspense>
    </Canvas>
  );
};

export default Experience;
