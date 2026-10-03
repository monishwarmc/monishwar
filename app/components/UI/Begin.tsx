"use client";
import { useData } from "../contexts/Data";

const Begin = () => {
  const { zoom, setZoom } = useData();

  const click = () => {
    setZoom(!zoom);
  };
  return (
    <div className="absolute bottom-0 left-1/2 -translate-x-1/2 pointer-events-auto w-fit ">
      <button
        onClick={click}
        className="text-3xl font-bold text-white transition-transform duration-300 hover:scale-110 active:scale-95 cursor-pointer bg-red-400 px-3 py-2 rounded-t-xl"
      >
        begin exploring
      </button>
    </div>
  );
};

export default Begin;
