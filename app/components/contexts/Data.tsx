"use client";

import { CameraControlsImpl } from "@react-three/drei";
import React, {
  createContext,
  ReactNode,
  useRef,
  useContext,
  useState,
} from "react";
import * as THREE from "three";

interface DataType {
  camRef: React.RefObject<CameraControlsImpl>;
  spaceshipRef: React.RefObject<THREE.Group>;
  worldRef: React.RefObject<THREE.Group>;
  zoom: boolean;
  setZoom: (val: boolean) => void;
}

const Data = createContext<DataType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const camRef = useRef<CameraControlsImpl>(null!);
  const spaceshipRef = useRef<THREE.Group>(null!);
  const worldRef = useRef<THREE.Group>(null!);
  const [zoom, setZoom] = useState(false);

  return (
    <Data.Provider
      value={{
        camRef,
        spaceshipRef,
        worldRef,
        zoom,
        setZoom,
      }}
    >
      {children}
    </Data.Provider>
  );
};

export const useData = (): DataType => {
  const context = useContext(Data);
  if (!context) {
    throw new Error("useData must be used within DataProvider");
  }
  return context;
};
