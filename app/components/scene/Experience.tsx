"use client";

import { Canvas } from "@react-three/fiber";
import Light from "./Light";
import Camera from "./Camera";
import World from "./World";
import { Environment } from "@react-three/drei";

const Experience = () => {
  return (
    <Canvas
      camera={{
        position: [3, 1, 4],
        fov: 69,
        near: 0.01,
      }}
    >
      <Environment files={"/textures/space.hdr"} background />
      <Light />
      <Camera />
      <World />
    </Canvas>
  );
};

export default Experience;
