"use client";

import { Canvas } from "@react-three/fiber";
import { Sparkles } from "@react-three/drei";
import * as THREE from "three";
import { Suspense, useState, useEffect } from "react";
import Camera from "./CameraControls";
import Light from "./Light";
import Environment from "./Environment";
import MoniOnCake from "../MoniOnCake";

export default function Scene() {
  const [showCake, setShowCake] = useState(true);
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    // 🌟 FIX: Defer the state change out of the synchronous layout phase
    // to prevent cascading render cycles
    queueMicrotask(() => {
      setIsClient(true);
    });
  }, []);

  if (!isClient) {
    return null;
  }

  return (
    <Canvas
      camera={{
        position: [0, 1, 8],
        fov: 45,
      }}
      gl={{
        powerPreference: "high-performance",
        antialias: true,
      }}
      shadows={{
        type: THREE.PCFShadowMap,
      }}
    >
      <Camera />

      <Suspense fallback={null}>
        {showCake ? (
          <MoniOnCake onComplete={() => setShowCake(false)} />
        ) : (
          <Environment />
        )}
        <Light />

        <Sparkles
          count={3000}
          speed={0.1}
          opacity={0.1}
          color="rgb(0, 229, 255)"
          size={1.3}
          scale={16}
          noise={1}
        />
      </Suspense>
    </Canvas>
  );
}
