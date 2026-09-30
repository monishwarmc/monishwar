import React from "react";

const Light = () => {
  return (
    <>
      <ambientLight intensity={0.6} />
      <directionalLight position={[0, 0, 5]} />
    </>
  );
};

export default Light;
