"use client";

import * as THREE from "three";
import { useTexture } from "@react-three/drei";
import { useMemo } from "react";

export default function Ground() {
  const textures = useTexture({
    map: "/textures/Grass_ground/BaseColor.jpg",
    normalMap: "/textures/Grass_ground/Normal.png",
    roughnessMap: "/textures/Grass_ground/Roughness.jpg",
    metalnessMap: "/textures/Grass_ground/Metallic.jpg",
    displacementMap: "/textures/Grass_ground/Displacement.png",
    aoMap: "/textures/Grass_ground/AmbientOcclusion.jpg",
  });

  const configuredTextures = useMemo(() => {
    const configure = (texture: THREE.Texture) => {
      texture.wrapS = THREE.RepeatWrapping;
      texture.wrapT = THREE.RepeatWrapping;
      texture.repeat.set(30, 30);
      texture.anisotropy = 16;
      return texture;
    };

    return {
      map: configure(textures.map),
      normalMap: configure(textures.normalMap),
      roughnessMap: configure(textures.roughnessMap),
      metalnessMap: configure(textures.metalnessMap),
      displacementMap: configure(textures.displacementMap),
      aoMap: configure(textures.aoMap),
    };
  }, [textures]);

  return (
    <mesh rotation-x={-Math.PI / 2} position={[200, -1.9, 100]} receiveShadow>
      <planeGeometry args={[500, 250, 300, 300]} />

      <meshStandardMaterial
        map={configuredTextures.map}
        normalMap={configuredTextures.normalMap}
        roughnessMap={configuredTextures.roughnessMap}
        metalnessMap={configuredTextures.metalnessMap}
        displacementMap={configuredTextures.displacementMap}
        aoMap={configuredTextures.aoMap}
        displacementScale={0.8}
        displacementBias={-0.42}
      />
    </mesh>
  );
}
