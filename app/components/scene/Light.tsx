export default function Light() {
  return (
    <>
      <ambientLight intensity={1} />
      <directionalLight
        position={[5, 5, 5]}
        intensity={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <directionalLight position={[-5, 5, 5]} intensity={2} />
    </>
  );
}
