import KeyboardProvider from "./components/controls/KeyboardProvider";
import Experience from "./components/scene/Experience";
import Hud from "./components/UI/Hud";

export default function Page() {
  return (
    <KeyboardProvider>
      <main className="relative m-0 h-dvh w-dvw touch-none select-none overflow-hidden bg-black">
        <div className="absolute inset-0 z-0">
          <Experience />
        </div>

        <Hud />
      </main>
    </KeyboardProvider>
  );
}
