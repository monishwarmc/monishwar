/**
 * The camera's compass heading, published from the render loop and consumed by
 * the HUD compass.
 *
 * Deliberately not React state: this changes every frame, and re-rendering the
 * overlay 60 times a second to move a strip of text would cost more than the
 * whole compass is worth. Subscribers write straight to the DOM instead.
 */
type HeadingListener = (radians: number) => void;

const listeners = new Set<HeadingListener>();

let heading = 0;

export const publishHeading = (radians: number) => {
  if (radians === heading) return;

  heading = radians;
  listeners.forEach((listener) => listener(radians));
};

export const getHeading = () => heading;

export const subscribeHeading = (listener: HeadingListener) => {
  listeners.add(listener);
  listener(heading);

  return () => {
    listeners.delete(listener);
  };
};
