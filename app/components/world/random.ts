/**
 * A tiny deterministic random number generator.
 *
 * Scenery gets scattered once, when its component mounts, and it has to come
 * out identical every time. Two reasons, and the second is the one that bites:
 *
 *   1. A field that reshuffles itself on every reload is a field nobody can
 *      tune — you can never tell whether you changed it or it changed itself.
 *   2. The scatter happens inside `useMemo`, which React is allowed to throw
 *      away and re-run. `Math.random` there makes the component impure, and
 *      React's lint rules reject it for exactly that reason.
 *
 * Linear congruential, with the constants from Numerical Recipes. It is not
 * good randomness. It is perfectly good scatter.
 *
 *   const random = makeRandom(1337);
 *   const angle = random() * Math.PI * 2;
 */
export const makeRandom = (seed: number) => {
  let state = seed;

  return () => {
    state = (state * 1664525 + 1013904223) % 4294967296;
    return state / 4294967296;
  };
};
