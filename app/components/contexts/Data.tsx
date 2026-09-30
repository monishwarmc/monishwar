"use client";

import { createContext, ReactNode, useRef, useContext } from "react";
import { OrbitControls } from "three-stdlib";

interface DataType {
  orbitRef: React.RefObject<OrbitControls | null>;
}

const Data = createContext<DataType | undefined>(undefined);

export const DataProvider = ({ children }: { children: ReactNode }) => {
  const orbitRef = useRef<OrbitControls>(null);

  return (
    <Data.Provider
      value={{
        orbitRef,
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
