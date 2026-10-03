import { useKeyboardControls } from "@react-three/drei";

export const keyboardMap = [
  { name: "forward", keys: ["ArrowUp", "w", "W"] },
  { name: "backward", keys: ["ArrowDown", "s", "S"] },
  { name: "left", keys: ["ArrowLeft", "a", "A"] },
  { name: "right", keys: ["ArrowRight", "d", "D"] },
  { name: "run", keys: ["r", "R", "Shift"] },
  { name: "jump", keys: [" "] },
];

const Controller = () => {
  const [, get] = useKeyboardControls();

  return <div>Joystick</div>;
};

export default Controller;
