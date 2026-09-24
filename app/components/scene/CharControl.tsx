import { useRef } from "react";
import { Ecctrl, type EcctrlHandle } from "ecctrl";
import { Monishwar } from "@/app/models/Monishwar";
import { Physics } from "@react-three/rapier";

function CharControl() {
  const ecctrl = useRef<EcctrlHandle>(null);

  return (
    <>
      <Physics gravity={[0, 0, 0]}>
        <Ecctrl ref={ecctrl}>
          <Monishwar position={[0, -0.87, 0]} />
        </Ecctrl>
      </Physics>
    </>
  );
}

export default CharControl;
