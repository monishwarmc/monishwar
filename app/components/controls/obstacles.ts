import * as THREE from "three";

/**
 * Cylindrical no-go volumes the avatar slides around.
 *
 * Anything solid in the world — the fountain, a zone's plinth, the comms mast
 * — registers a circle here and the character controller pushes the avatar out
 * of it. Circles rather than meshes because every obstacle in this scene is
 * effectively a column standing on a flat disc, and a per-frame circle test
 * over a dozen entries costs nothing next to a trimesh collider.
 */
export type Obstacle = {
  /** Read per frame, so an obstacle may sit under an animated parent. */
  object: THREE.Object3D;
  /** World-space radius of the blocked column. */
  radius: number;
  /** Avatar may pass above this world height — lets it jump onto low rims. */
  clearHeight?: number;
};

const obstacles = new Map<string, Obstacle>();

export const registerObstacle = (id: string, obstacle: Obstacle) => {
  obstacles.set(id, obstacle);
  return () => {
    obstacles.delete(id);
  };
};

export const getObstacles = () => obstacles;

const center = new THREE.Vector3();

/**
 * Pushes `next` out of every obstacle it has entered.
 *
 * Resolving against the circle's edge rather than cancelling the whole step is
 * what makes the avatar slide along a rim instead of sticking to it: the
 * component of motion along the tangent survives, only the component into the
 * circle is removed.
 */
export const resolveObstacles = (
  next: THREE.Vector3,
  feetY: number,
  bodyRadius: number,
) => {
  let blocked = false;

  for (const { object, radius, clearHeight } of obstacles.values()) {
    object.getWorldPosition(center);

    if (clearHeight !== undefined && feetY > center.y + clearHeight) continue;

    const dx = next.x - center.x;
    const dz = next.z - center.z;
    const limit = radius + bodyRadius;
    const distance = Math.hypot(dx, dz);

    if (distance >= limit) continue;

    blocked = true;

    if (distance < 1e-6) {
      // Dead centre: pick a direction rather than dividing by zero.
      next.setX(center.x + limit);
      continue;
    }

    const push = limit / distance;
    next.setX(center.x + dx * push);
    next.setZ(center.z + dz * push);
  }

  return blocked;
};
