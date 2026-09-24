import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { ThreeElements } from "@react-three/fiber";

type GLTFResult = GLTF & {
  nodes: {
    Couch_1001: THREE.Mesh;
    Couch_1001_1: THREE.Mesh;
  };
  materials: {
    ["Couch_Blue.001"]: THREE.MeshStandardMaterial;
    ["Black.001"]: THREE.MeshStandardMaterial;
  };
};

export function Sofa(props: ThreeElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/models/sofa.glb",
  ) as unknown as GLTFResult;

  return (
    <group {...props} dispose={null}>
      <group name="Couch_Small1" position={[0, -0.5, -0.85]} scale={0.5}>
        <mesh
          name="Couch_1001"
          castShadow
          receiveShadow
          geometry={nodes.Couch_1001.geometry}
          material={materials["Couch_Blue.001"]}
        />
        <mesh
          name="Couch_1001_1"
          castShadow
          receiveShadow
          geometry={nodes.Couch_1001_1.geometry}
          material={materials["Black.001"]}
        />
        <mesh
          name="Couch_1001_1"
          castShadow
          receiveShadow
          geometry={nodes.Couch_1001_1.geometry}
          material={materials["Black.001"]}
          scale={1.13}
          position={[0, -0.5, 0]}
        />
      </group>
    </group>
  );
}

useGLTF.preload("/models/sofa.glb");
