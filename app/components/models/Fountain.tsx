import * as THREE from "three";
import { PositionalAudio, useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { ThreeElements, useFrame } from "@react-three/fiber";
import { useRef, useEffect } from "react";

type GLTFResult = GLTF & {
  nodes: {
    f_base: THREE.Mesh;
    f_base_water: THREE.Mesh;
    f_flow_water: THREE.Mesh;
    f_water_mid: THREE.Mesh;
    f_water_top: THREE.Mesh;
  };
  materials: {
    h_1Shape: THREE.MeshStandardMaterial;
    f_1Shape: THREE.MeshPhysicalMaterial;
    fShape: THREE.MeshPhysicalMaterial;
    f_3Shape: THREE.MeshPhysicalMaterial;
    f_2Shape: THREE.MeshPhysicalMaterial;
  };
};

export function Fountain(props: ThreeElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/models/fountain.glb",
  ) as unknown as GLTFResult;

  const flowWaterRef = useRef<THREE.Mesh>(null);
  const waterGroupRef = useRef<THREE.Group>(null);
  const flowTextureRef = useRef<THREE.Texture | null>(null);
  const poolMaterialsRef = useRef<THREE.MeshPhysicalMaterial[]>([]);

  useEffect(() => {
    if (flowWaterRef.current) {
      const clonedFlowMat = materials.fShape.clone();
      flowWaterRef.current.material = clonedFlowMat;

      const tex = clonedFlowMat.map || clonedFlowMat.normalMap;
      if (tex) {
        const clonedTex = tex.clone();
        clonedTex.wrapS = THREE.RepeatWrapping;
        clonedTex.wrapT = THREE.RepeatWrapping;
        clonedTex.needsUpdate = true;

        if (clonedFlowMat.map) clonedFlowMat.map = clonedTex;
        if (clonedFlowMat.normalMap) clonedFlowMat.normalMap = clonedTex;

        flowTextureRef.current = clonedTex;
      }
    }

    if (waterGroupRef.current) {
      const clonedPoolMats: THREE.MeshPhysicalMaterial[] = [];

      waterGroupRef.current.children.forEach((child) => {
        if (child instanceof THREE.Mesh) {
          const clonedMat = child.material.clone();
          child.material = clonedMat;
          clonedPoolMats.push(clonedMat);
        }
      });

      poolMaterialsRef.current = clonedPoolMats;
    }
  }, [materials]);

  const audioRef = useRef<THREE.PositionalAudio>(null);

  useEffect(() => {
    audioRef.current?.setVolume(6);
  }, []);

  useFrame((state, delta) => {
    const time = state.clock.elapsedTime;

    if (flowTextureRef.current) {
      flowTextureRef.current.offset.y += delta * 0.36;
      if (flowWaterRef.current instanceof THREE.Mesh)
        flowWaterRef.current.position.y = Math.sin(time * 3) * 0.01;
    }

    if (waterGroupRef.current) {
      waterGroupRef.current.children.forEach((child, index) => {
        if (child instanceof THREE.Mesh) {
          child.position.y = Math.sin(time * 3 - index * 6) * 0.023;
          child.rotation.y += delta * (0.3 + index * 0.1);
        }
      });
    }
  });

  return (
    <group {...props} dispose={null} position={[0, 0.03, 0]} scale={0.03}>
      <PositionalAudio
        url="/audio/fountain.mp3"
        distance={10}
        loop
        autoplay
        ref={audioRef}
      />
      <mesh
        name="f_base"
        castShadow
        receiveShadow
        geometry={nodes.f_base.geometry}
        material={materials.h_1Shape}
      >
        <mesh
          ref={flowWaterRef}
          name="f_flow_water"
          castShadow
          receiveShadow
          geometry={nodes.f_flow_water.geometry}
          material={materials.fShape}
        />

        <group ref={waterGroupRef}>
          <mesh
            name="f_base_water"
            castShadow
            receiveShadow
            geometry={nodes.f_base_water.geometry}
            material={materials.f_1Shape}
          />
          <mesh
            name="f_water_mid"
            castShadow
            receiveShadow
            geometry={nodes.f_water_mid.geometry}
            material={materials.f_3Shape}
          />
          <mesh
            name="f_water_top"
            castShadow
            receiveShadow
            geometry={nodes.f_water_top.geometry}
            material={materials.f_2Shape}
          />
        </group>
      </mesh>
    </group>
  );
}

useGLTF.preload("/models/fountain.glb");
