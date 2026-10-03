import re

with open('src/components/world3d/PortHavenCanvas.tsx', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Fix duplicated NavMeshGroup creation
scene_creation = """    const scene = new THREE.Scene();
    const navMeshGroup = new THREE.Group();
    navMeshGroup.name = "navMeshLayer";
    navMeshGroup.layers.set(2);
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ visible: false }));
    floorMesh.layers.set(2);
    navMeshGroup.add(floorMesh);
    scene.add(navMeshGroup);"""
    
content = re.sub(r'    const scene = new THREE\.Scene\(\);.*?(const camera = new THREE\.PerspectiveCamera)', scene_creation + r'\n    \1', content, flags=re.DOTALL)

# 2. Fix duplicated raycast logic
raycast_logic = """      // Bounded Walkable Area
      let minX = isCave ? -32 : -75;
      let maxX = isCave ? 32 : 75;
      let minZ = isCave ? -38 : -50;
      let maxZ = isCave ? 52 : 90;

      heroPositionRef.current.x = THREE.MathUtils.clamp(nextX, minX, maxX);
      heroPositionRef.current.z = THREE.MathUtils.clamp(nextZ, minZ, maxZ);

      // Decoupled Vertical Raycast against NavMesh (Layer 2)
      verticalRaycaster.set(new THREE.Vector3(heroPositionRef.current.x, 100.0, heroPositionRef.current.z), downwardVec);
      const intersects = verticalRaycaster.intersectObject(navMeshGroup, true);
      if (intersects.length > 0) {
         heroPositionRef.current.y = intersects[0].point.y;
      } else {
         heroPositionRef.current.y = 1.0;
      }"""

content = re.sub(r'      // Bounded Walkable Area.*?(?=\n      // Shortest Angular Heading Interpolation)', raycast_logic, content, flags=re.DOTALL)

with open('src/components/world3d/PortHavenCanvas.tsx', 'w', encoding='utf-8') as f:
    f.write(content)

print("PortHavenCanvas.tsx cleaned.")
