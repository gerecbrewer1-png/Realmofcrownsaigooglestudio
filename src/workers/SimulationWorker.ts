// Web Worker for Simulation

let localEntities: any[] = [];

self.onmessage = (e) => {
  const { id, type, payload, origin, direction } = e.data;

  switch (type) {
    case 'SYNC_REGION':
      // Update the local spatial representation
      localEntities = payload;
      break;
    
    case 'RAYCAST_QUERY':
      // Perform math raycast against simplified bounding spheres
      const hit = performRaycast(origin, direction, localEntities);
      self.postMessage({ id, type: 'RAYCAST_RESULT', result: hit });
      break;

    case 'COLLISION_QUERY':
      // Perform spatial grid checks
      break;

    case 'PATHFIND_QUERY':
      // Perform A* or similar on simplified nav mesh
      break;
  }
};

function performRaycast(origin: any, dir: any, entities: any[]) {
  // Mock CPU intensive task
  let closest = null;
  let minDist = Infinity;

  for (let i = 0; i < entities.length; i++) {
    // simplified math
    const dx = entities[i].x - origin.x;
    const dy = entities[i].y - origin.y;
    const dz = entities[i].z - origin.z;
    const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
    
    if (dist < minDist && dist < entities[i].radius) {
      minDist = dist;
      closest = entities[i].id;
    }
  }

  return { hitId: closest, distance: minDist };
}
