import * as THREE from "three";
import { useGLTF } from "@react-three/drei";
import { GLTF } from "three-stdlib";
import { ThreeElements } from "@react-three/fiber";
import {
  metres,
  SOFA_FIT,
  SOFA_MODEL,
} from "@/app/constants/world.constants";

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

/**
 * A two-seater, sized so the avatar can actually sit on it.
 *
 * Its origin is the middle of the cushion at floor level and it faces +Z, so
 * whatever places it only has to say where on the deck it stands and which way
 * it looks — see SofaSpot, which puts the avatar on it.
 *
 * Two things used to be wrong here. The export's own transform was copied in
 * verbatim, which left the couch nearly a metre behind its own anchor; and the
 * black base mesh was drawn a second time, scaled up and dropped half a unit,
 * which is what the fitting code then measured. The sofa came out about a
 * quarter too small with a phantom slab under it, and the avatar sat in the
 * air above the arm.
 *
 * `SOFA_FIT` and the measurements it comes from are in world.constants.
 */
export function Sofa(props: ThreeElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/models/sofa.glb",
  ) as unknown as GLTFResult;

  return (
    <group {...props} dispose={null}>
      <group
        name="Couch_Small1"
        // Model units to world units, then shift so the cushion centre lands
        // on this group's origin and the underside on the ground.
        scale={metres(SOFA_FIT)}
        position={[
          0,
          metres(-SOFA_MODEL.underside * SOFA_FIT),
          metres(-SOFA_MODEL.cushionZ * SOFA_FIT),
        ]}
      >
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
      </group>
    </group>
  );
}
