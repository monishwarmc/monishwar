import FullScreen from "./components/FullScreen";
import Experience from "./components/scene/Experience";
import UIcontrols from "./components/UIcontrols";

export default function Page() {
  return (
    <div className="relative m-0 h-dvh w-dvw overflow-hidden select-none touch-none bg-[rgb(1,75,86)]">
      <UIcontrols />
      <FullScreen />
      <Experience />
    </div>
  );
}
