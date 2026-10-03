const fs = require('fs');

let content = fs.readFileSync('src/components/world3d/PortHavenCanvas.tsx', 'utf8');

// Add navMeshGroup creation
const sceneCreation = `const scene = new THREE.Scene();
    const navMeshGroup = new THREE.Group();
    navMeshGroup.name = "navMeshLayer";
    navMeshGroup.layers.set(2);
    // Add simple floor quad
    const floorGeo = new THREE.PlaneGeometry(1000, 1000);
    floorGeo.rotateX(-Math.PI / 2);
    const floorMesh = new THREE.Mesh(floorGeo, new THREE.MeshBasicMaterial({ visible: false }));
    floorMesh.layers.set(2);
    navMeshGroup.add(floorMesh);
    scene.add(navMeshGroup);`;

content = content.replace('const scene = new THREE.Scene();', sceneCreation);

// Add raycast variables before animate loop
const varsToAdd = `
    const verticalRaycaster = new THREE.Raycaster();
    verticalRaycaster.layers.set(2); // Only test against Layer 2
    const downwardVec = new THREE.Vector3(0, -1, 0);

    const animate = () => {`;
content = content.replace('const animate = () => {', varsToAdd);

// Add raycast logic in animate loop
const raycastLogic = `
      // Bounded Walkable Area
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
         heroPositionRef.current.y = 1.0; // fallback
      }
`;

content = content.replace(/      \/\/ Bounded Walkable Area\n      let minX = isCave \? -32 : -75;\n      let maxX = isCave \? 32 : 75;\n      let minZ = isCave \? -38 : -50;\n      let maxZ = isCave \? 52 : 90;\n\n      heroPositionRef.current.x = THREE\.MathUtils\.clamp\(nextX, minX, maxX\);\n      heroPositionRef.current.z = THREE\.MathUtils\.clamp\(nextZ, minZ, maxZ\);/m, raycastLogic);

const heroSetLogic = `
      // Update hero mesh position in scene
      if (heroMeshRef.current) {
        heroMeshRef.current.position.set(heroPositionRef.current.x, heroPositionRef.current.y, heroPositionRef.current.z);
        heroMeshRef.current.rotation.y = heroHeadingRef.current;
      }`;
      
content = content.replace(/      \/\/ Update hero mesh position in scene\n      if \(heroMeshRef.current\) {\n        heroMeshRef.current.position.set\(heroPositionRef.current.x, 1.0, heroPositionRef.current.z\);\n        heroMeshRef.current.rotation.y = heroHeadingRef.current;\n      }/m, heroSetLogic);

fs.writeFileSync('src/components/world3d/PortHavenCanvas.tsx', content, 'utf8');
console.log("PortHavenCanvas.tsx modified.");
