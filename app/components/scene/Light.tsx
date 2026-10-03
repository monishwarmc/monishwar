"use client";

const Light = () => {
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight
        position={[0, 0.5, -100]}
        intensity={6}
        color={"rgb(50, 168, 252)"}
      />
      <directionalLight
        position={[1, -6, 100]}
        intensity={6}
        color={"rgb(183, 220, 247)"}
      />
      <directionalLight
        position={[-13, -1, -1]}
        intensity={1}
        color={"rgb(255, 255, 255)"}
      />
      <directionalLight
        position={[13, -1, 1]}
        intensity={1}
        color={"rgb(218, 255, 253)"}
      />
    </>
  );
};

export default Light;
