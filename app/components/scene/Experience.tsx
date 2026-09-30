"use client";

import { Canvas } from "@react-three/fiber";
import Light from "./Light";
import Camera from "./Camera";
import { Fountain } from "../models/Fountain";
import { World } from "../models/World";
import { Environment } from "@react-three/drei";

const Experience = () => {
  return (
    <Canvas>
      <Environment preset="night" background />
      <Light />
      <Camera />
      <World />
    </Canvas>
  );
};

export default Experience;
