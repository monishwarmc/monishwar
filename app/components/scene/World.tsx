import { useFrame } from "@react-three/fiber";
import { Monishwar } from "../models/Monishwar";
import { Spaceship } from "../models/Spaceship";
import { useData } from "../contexts/Data";
import * as THREE from "three";

const World = () => {
  const { worldRef, spaceshipRef, zoom } = useData();

  useFrame((_, delta) => {
    if (zoom) return;
    if (!worldRef) return;
    const elapsedTime = _.clock.getElapsedTime();
    worldRef.current.position.y = Math.sin(elapsedTime * 1.9) * 0.06;
    worldRef.current.rotation.z = Math.sin(elapsedTime * 1.5) * 0.01;
    worldRef.current.rotation.x = Math.sin(elapsedTime * 1.6) * 0.01;

    if (!spaceshipRef) return;

    const mesh1 = spaceshipRef.current.getObjectByName("Cone");
    const mesh2 = spaceshipRef.current.getObjectByName("solar");

    if (mesh1 instanceof THREE.Mesh && mesh2 instanceof THREE.Mesh) {
      mesh1!.rotation.y += delta;
      mesh2!.rotation.y += delta;
    }
  });

  return (
    <group ref={worldRef}>
      <Spaceship />
      <Monishwar />
    </group>
  );
};

export default World;
