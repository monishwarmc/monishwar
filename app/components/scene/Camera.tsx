import { OrbitControls } from "@react-three/drei";
import { useData } from "../contexts/Data";

const Camera = () => {
  const { orbitRef } = useData();

  return (
    <>
      <OrbitControls ref={orbitRef} />
    </>
  );
};

export default Camera;
