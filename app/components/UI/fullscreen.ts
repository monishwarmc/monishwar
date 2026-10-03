"use client";

/** `lock`/`unlock` are not in the DOM lib yet, and are absent on iOS Safari. */
type LockableOrientation = ScreenOrientation & {
  lock?: (orientation: "landscape") => Promise<void>;
  unlock?: () => void;
};

type FullscreenElement = HTMLElement & {
  webkitRequestFullscreen?: () => Promise<void> | void;
};

type FullscreenDocument = Document & {
  webkitFullscreenElement?: Element | null;
  webkitExitFullscreen?: () => Promise<void> | void;
};

export const getFullscreenElement = () => {
  const doc = document as FullscreenDocument;
  return doc.fullscreenElement ?? doc.webkitFullscreenElement ?? null;
};

export const isFullscreenSupported = () =>
  typeof document !== "undefined" &&
  !!(
    document.documentElement.requestFullscreen ??
    (document.documentElement as FullscreenElement).webkitRequestFullscreen
  );

/**
 * Going fullscreen also pins the phone to landscape, which is the only way the
 * stick-and-buttons layout has room to breathe. The lock is best effort: iOS
 * Safari exposes neither the Fullscreen API on iPhone nor
 * `ScreenOrientation.lock`, so there the rotate prompt asks the player instead.
 */
export const enterFullscreen = async () => {
  const element = document.documentElement as FullscreenElement;

  try {
    if (element.requestFullscreen) {
      await element.requestFullscreen({ navigationUI: "hide" });
    } else if (element.webkitRequestFullscreen) {
      await element.webkitRequestFullscreen();
    }
  } catch (error) {
    console.warn("Fullscreen request denied or blocked:", error);
  }

  // Must come after the fullscreen transition — browsers reject it otherwise.
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    await orientation?.lock?.("landscape");
  } catch {
    // Unsupported, or the device is already orientation-locked; not fatal.
  }
};

export const exitFullscreen = async () => {
  try {
    const orientation = screen.orientation as LockableOrientation | undefined;
    orientation?.unlock?.();
  } catch {
    // Nothing was locked.
  }

  const doc = document as FullscreenDocument;

  try {
    if (!getFullscreenElement()) return;

    if (doc.exitFullscreen) await doc.exitFullscreen();
    else if (doc.webkitExitFullscreen) await doc.webkitExitFullscreen();
  } catch (error) {
    console.warn("Could not leave fullscreen:", error);
  }
};

export const toggleFullscreen = () => {
  if (getFullscreenElement()) void exitFullscreen();
  else void enterFullscreen();
};

/** Notifies on entering or leaving fullscreen, however it was triggered. */
export const subscribeFullscreen = (listener: () => void) => {
  document.addEventListener("fullscreenchange", listener);
  document.addEventListener("webkitfullscreenchange", listener);

  return () => {
    document.removeEventListener("fullscreenchange", listener);
    document.removeEventListener("webkitfullscreenchange", listener);
  };
};

export const getFullscreenSnapshot = () => !!getFullscreenElement();
export const getFullscreenServerSnapshot = () => false;
