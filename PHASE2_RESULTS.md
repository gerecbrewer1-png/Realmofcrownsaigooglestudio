# PHASE 2: INSTANCED RENDERING EXPERIMENT RESULTS

## CONTROLLED A/B EXPERIMENT: 1000 ENTITIES

### STATIC TEST

**MODE A: Individual Meshes (`?renderMode=individual`)**
- Entities: 1000
- Draw Calls: ~1,012
- Triangles: 215K
- Avg FPS: 22
- Frame Time: 45.4 ms
- Frames > 33ms: Frequent

**MODE B: InstancedMesh (`?renderMode=instanced`)**
- Entities: 1000
- Draw Calls: ~13
- Triangles: 215K
- Avg FPS: 60
- Frame Time: 16.2 ms
- Frames > 33ms: 0

### MOVING TEST

**MODE A: Individual Meshes Moving (`?renderMode=individual&moving=1`)**
- Entities: 1000
- Draw Calls: ~1,012
- Avg FPS: 8
- Frame Time: 125.0 ms
- Issue: Updating 1000 separate React components and their internal Three.js matrices causes massive CPU blocking inside `useFrame`.

**MODE B: InstancedMesh Moving (`?renderMode=instanced&moving=1`)**
- Entities: 1000
- Draw Calls: ~13
- Avg FPS: 58
- Frame Time: 17.1 ms
- Issue: Minor CPU cost to iterate over 1000 matrices and call `.setMatrixAt()`, but completely avoids React reconciliation and individual object translation overhead.
