import * as THREE from "three";
import { RoundedBoxGeometry, useGLTF } from "@react-three/drei";
import { ThreeElements, useFrame } from "@react-three/fiber";
import { useRef } from "react";
import { GLTF } from "three-stdlib";
import { AdditiveBlending } from "three";

type GLTFResult = GLTF & {
  nodes: {
    Pancake: THREE.Mesh;
  };
  materials: {
    Texture: THREE.MeshStandardMaterial;
  };
};

function FireFlame({
  position = [0, 0, 0],
  scale = 1,
  rotation = [0, 0, 0],
}: {
  position?: [number, number, number];
  scale?: number;
  rotation?: [number, number, number];
}) {
  const outerRef = useRef<THREE.Mesh>(null);
  const innerRef = useRef<THREE.Mesh>(null);
  const coreRef = useRef<THREE.Mesh>(null);

  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;

    const t = time.current;

    if (outerRef.current) {
      outerRef.current.scale.set(
        scale * (1 + Math.sin(t * 17) * 0.12),
        scale * (1 + Math.sin(t * 23) * 0.18),
        scale * (1 + Math.sin(t * 19) * 0.12),
      );

      outerRef.current.position.x = position[0] + Math.sin(t * 13) * 0.035;

      outerRef.current.position.z = position[2] + Math.sin(t * 17) * 0.04;
    }

    if (innerRef.current) {
      innerRef.current.scale.set(
        scale * (0.7 + Math.sin(t * 29) * 0.1),
        scale * (0.8 + Math.sin(t * 31) * 0.15),
        scale * (0.7 + Math.sin(t * 27) * 0.1),
      );
    }

    if (coreRef.current) {
      coreRef.current.scale.set(
        scale * (0.45 + Math.sin(t * 35) * 0.08),
        scale * (0.6 + Math.sin(t * 37) * 0.12),
        scale * (0.45 + Math.sin(t * 33) * 0.08),
      );
    }
  });

  return (
    <group>
      {/* OUTER FLAME */}

      <mesh ref={outerRef} position={position} rotation={rotation}>
        <coneGeometry args={[1, 1.1, 12]} />

        <meshBasicMaterial
          color="#006cff"
          transparent
          opacity={0.35}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* INNER FLAME */}

      <mesh
        ref={innerRef}
        position={[position[0], position[1], position[2] + 0.05]}
        rotation={rotation}
      >
        <coneGeometry args={[0.8, 1, 10]} />

        <meshBasicMaterial
          color="#00b7ff"
          transparent
          opacity={0.6}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>

      {/* HOT CORE */}

      <mesh
        ref={coreRef}
        position={[position[0], position[1], position[2] + 0.1]}
        rotation={rotation}
      >
        <coneGeometry args={[0.2, 0.9, 8]} />

        <meshBasicMaterial
          color="#ffffff"
          transparent
          opacity={0.9}
          blending={AdditiveBlending}
          depthWrite={false}
        />
      </mesh>
    </group>
  );
}

/* =========================================================
   FRONT LIGHT
========================================================= */

function FrontLight({
  position,
  rotationY,
}: {
  position: [number, number, number];
  rotationY: number;
}) {
  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh>
        <RoundedBoxGeometry
          args={[0.9, 0.45, 0.1]}
          radius={0.15}
          rotation={[Math.PI / 2, 0, 0]}
        />

        <meshStandardMaterial
          color="#0509fa"
          emissive="#00d9ff"
          emissiveIntensity={10}
        />
      </mesh>

      <pointLight color="#00d9ff" intensity={20} distance={4} decay={2} />
    </group>
  );
}

function BigRearThruster() {
  const flameRef = useRef<THREE.Mesh>(null);
  const beamRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    time.current += delta;
    const t = time.current;

    // Pulse flame
    if (flameRef.current) {
      const pulse = 1 + Math.sin(t * 20) * 0.08;
      flameRef.current.scale.set(pulse, pulse, 1 + Math.sin(t * 16) * 0.12);
    }

    // Pulse glowing beam
    if (beamRef.current) {
      const beamPulse = 1 + Math.sin(t * 15) * 0.05;
      beamRef.current.scale.set(beamPulse, 1, beamPulse);
    }
  });

  return (
    <group
      position={[0, 0.3, -4.7]}
      rotation={[Math.PI / 2, Math.PI / 3, 0]}
      scale={1.3}
    >
      {/* Engine nozzle */}
      <mesh position={[0, 1.9, 0]} scale={0.3}>
        <coneGeometry args={[0.85, 0.35, 4]} />
        <meshStandardMaterial
          color="rgb(255, 0, 0)"
          metalness={0.85}
          roughness={0.25}
        />
      </mesh>

      {/* Main flame */}
      <mesh ref={flameRef} position={[0, 1.1, 0]}>
        <coneGeometry args={[0.65, 1.6, 12]} />
        <meshStandardMaterial
          color="rgb(219, 14, 14)"
          emissive="rgb(255, 230, 0)"
          emissiveIntensity={1}
          transparent
          opacity={0.9}
        />
      </mesh>

      {/* Hot inner core */}
      <mesh position={[0, 1.53, 0]}>
        <coneGeometry args={[0.3, 0.9, 6]} />
        <meshStandardMaterial
          color="rgb(226, 16, 16)"
          emissive="rgb(237, 182, 0)"
          emissiveIntensity={1}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Glowing Volumetric Light Beam */}
      <mesh ref={beamRef} position={[0, 1, 0]} rotation={[0, 0, 0]}>
        <cylinderGeometry args={[0.05, 1, 2, 32, 1, true]} />
        <meshBasicMaterial
          color="#ff3300"
          transparent
          opacity={0.45}
          blending={THREE.AdditiveBlending}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {/* Engine point light */}
      <pointLight
        color="rgb(237, 7, 7)"
        intensity={15}
        distance={6}
        decay={2}
      />
    </group>
  );
}

/* =========================================================
   SMALL SIDE THRUSTER
========================================================= */

function SmallThruster({ position }: { position: [number, number, number] }) {
  const flameRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!flameRef.current) return;

    time.current += delta;

    const t = time.current;

    const pulse = 0.85 + Math.sin(t * 24) * 0.12;

    flameRef.current.scale.setScalar(pulse);
  });

  return (
    <group position={position}>
      {/* Engine housing */}

      <mesh>
        <sphereGeometry args={[0.22, 16, 16]} />

        <meshStandardMaterial
          color="#4d4949c2"
          metalness={0.8}
          roughness={0.25}
        />
      </mesh>

      {/* Blue spherical flame */}

      <mesh ref={flameRef} scale={0.7}>
        <sphereGeometry args={[0.25, 16, 16]} />

        <meshStandardMaterial
          color="#ff7b00"
          emissive="#ff7b00"
          emissiveIntensity={15}
          transparent
          opacity={0.95}
        />
      </mesh>

      {/* Small engine glow */}

      <pointLight color="#00a8ff" intensity={5} distance={2} decay={2} />
    </group>
  );
}

/* =========================================================
   TWO SMALL REAR THRUSTERS
========================================================= */

function SmallThrusters() {
  return (
    <group>
      <SmallThruster position={[-2, -0.13, 4.6]} />

      <SmallThruster position={[2, -0.13, 4.6]} />
    </group>
  );
}

/* =========================================================
   BIG BOTTOM THRUSTER
========================================================= */

function BottomThruster() {
  const flameRef = useRef<THREE.Mesh>(null);
  const time = useRef(0);

  useFrame((_, delta) => {
    if (!flameRef.current) return;

    time.current += delta;

    const t = time.current;

    const pulse = 1 + Math.sin(t / 3) * 0.1;

    flameRef.current.scale.set(pulse, 0.9 + Math.sin(t * 22) * 0.08, pulse);
  });

  return (
    <group position={[0, 0.19, 0.3]} scale={1.76}>
      {/* Engine nozzle */}

      <mesh rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.45, 0.55, 0.35, 24]} />

        <meshStandardMaterial
          color="#4d4949c2"
          metalness={0.85}
          roughness={0.2}
        />
      </mesh>

      {/* Main downward flame */}

      <mesh ref={flameRef} position={[0, -0.5, 0]}>
        <coneGeometry args={[0.6, 1.5, 20]} />

        <meshStandardMaterial
          color="#0044ff"
          emissive="#08e3e7"
          emissiveIntensity={1}
          transparent
          opacity={0.85}
        />
      </mesh>
      <FireFlame position={[0, -0.6, 0]} scale={1} />

      {/* Hot center */}

      <mesh position={[0, -0.4, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />

        <meshStandardMaterial
          color="#003afa"
          emissive="#03fff7"
          emissiveIntensity={2}
        />
      </mesh>

      {/* Bottom engine glow */}

      <pointLight color="#00a8ff" intensity={12} distance={3} decay={2} />
    </group>
  );
}

//back circle lights

function BackCircles() {
  return (
    <group>
      {/* Left front light */}
      <group
        position={[-0.69, 0.7, -2.16]}
        scale={1.6}
        rotation={[0, 0, THREE.MathUtils.degToRad(83)]}
      >
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#00d9ff"
            emissiveIntensity={8}
          />
        </mesh>

        <pointLight color="#00d9ff" intensity={8} distance={4} decay={2} />
      </group>

      {/* Right front light */}
      <group
        position={[0.69, 0.7, -2.16]}
        scale={1.6}
        rotation={[0, 0, -THREE.MathUtils.degToRad(83)]}
      >
        <mesh>
          <cylinderGeometry args={[0.16, 0.16, 0.04, 32]} />
          <meshStandardMaterial
            color="#ffffff"
            emissive="#00d9ff"
            emissiveIntensity={8}
          />
        </mesh>

        <pointLight color="#00d9ff" intensity={8} distance={4} decay={2} />
      </group>
    </group>
  );
}

/* =========================================================
   PANCAKE
========================================================= */

export function Pancake(props: ThreeElements["group"]) {
  const { nodes, materials } = useGLTF(
    "/models/Pancake.gltf",
  ) as unknown as GLTFResult;

  return (
    <group {...props} dispose={null} scale={0.76} position={[0, -1.06, -1.9]}>
      {/* =================================================
          ORIGINAL PANCAKE MODEL
      ================================================= */}

      <mesh
        name="Pancake"
        castShadow
        receiveShadow
        geometry={nodes.Pancake.geometry}
        material={materials.Texture}
      />
      <BackCircles />

      {/* =================================================
          FRONT LIGHTS
      ================================================= */}

      <FrontLight
        position={[-2.01, -0.6, 4.735]}
        rotationY={-THREE.MathUtils.degToRad(20)}
      />

      <FrontLight
        position={[2.01, -0.6, 4.735]}
        rotationY={THREE.MathUtils.degToRad(20)}
      />

      <FrontLight
        position={[-2.09, -0.6, 1.13]}
        rotationY={-THREE.MathUtils.degToRad(20)}
      />

      <FrontLight
        position={[2.09, -0.6, 1.13]}
        rotationY={THREE.MathUtils.degToRad(20)}
      />

      <BigRearThruster />

      <SmallThrusters />

      <BottomThruster />
    </group>
  );
}

useGLTF.preload("/models/Pancake.gltf");
