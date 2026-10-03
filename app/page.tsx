import FullScreen from "./components/UI/FullScreen";
import Experience from "./components/scene/Experience";
import UIcontrols from "./components/UI/UIcontrols";
import Begin from "./components/UI/Begin";

export default function Page() {
  return (
    <main className="relative m-0 h-dvh w-dvw overflow-hidden select-none touch-none bg-black">
      <div className="absolute inset-0 z-0">
        <Experience />
      </div>
      <div className="absolute inset-0 z-10 pointer-events-none">
        <FullScreen />
        <UIcontrols />
        <Begin />
      </div>
    </main>
  );
}
