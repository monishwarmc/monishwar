import { useData } from "../contexts/Data";
import { useEffect } from "react";
import { useMonishwar } from "../contexts/MonishwarContext";
import * as THREE from "three";
import { CameraControls } from "@react-three/drei";

const Camera = () => {
  const { camRef, zoom } = useData();
  const { ref } = useMonishwar();

  useEffect(() => {
    if (!camRef?.current || !ref?.current || !zoom) return;

    // Get exact target center position inside the spaceship
    const targetPos = new THREE.Vector3();
    ref.current.getWorldPosition(targetPos);

    // Look at point: centered slightly above character base inside cockpit
    targetPos.y += 0.05;

    // Camera offset: scaled down to fit inside the 0.07 scaled glass dome
    const cameraPos = targetPos
      .clone()
      .add(new THREE.Vector3(0.08, 0.04, 0.12));

    // Smooth transition inside cockpit
    camRef.current.setLookAt(
      cameraPos.x,
      cameraPos.y,
      cameraPos.z,
      targetPos.x,
      targetPos.y,
      targetPos.z,
      true,
    );
  }, [zoom, camRef, ref]);

  return <CameraControls ref={camRef} maxDistance={20} minDistance={0} />;
};

export default Camera;
