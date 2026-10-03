import re

with open('src/components/world3d/CoastalHarborBuilder.ts', 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Add GLTFLoader import
if 'GLTFLoader' not in content:
    content = content.replace("import * as THREE from 'three';", "import * as THREE from 'three';\nimport { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';")

# 2. Add GLTFLoader instance
if 'const _gltfLoader = new GLTFLoader();' not in content:
    content = content.replace('export class CoastalHarborBuilder {', 'const _gltfLoader = new GLTFLoader();\n\nexport class CoastalHarborBuilder {')

# 3. Rename createBlackMarketCave to createSkullCavernSanctuary in createHarborCity
content = content.replace('this.createBlackMarketCave(config)', 'this.createSkullCavernSanctuary(config)')

# 4. Replace createBlackMarketCave definition entirely
skull_cavern = """
  public static createSkullCavernSanctuary(config: HarborConfig): THREE.Group {
    const caveGroup = new THREE.Group();
    caveGroup.name = `cave-${config.id}`;
    caveGroup.position.copy(config.position);
    if (config.rotationY) caveGroup.rotation.y = config.rotationY;

    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x18181b, roughness: 0.95, flatShading: true });
    
    // Skull Archway Mouth
    const leftPillarGeo = new THREE.CylinderGeometry(15, 20, 60, 8);
    const leftPillar = new THREE.Mesh(leftPillarGeo, basaltMat);
    leftPillar.position.set(-22.5, 30, 0);
    caveGroup.add(leftPillar);

    const rightPillarGeo = new THREE.CylinderGeometry(15, 20, 60, 8);
    const rightPillar = new THREE.Mesh(rightPillarGeo, basaltMat);
    rightPillar.position.set(22.5, 30, 0);
    caveGroup.add(rightPillar);

    const lintelGeo = new THREE.BoxGeometry(75, 12, 20);
    const lintel = new THREE.Mesh(lintelGeo, basaltMat);
    lintel.position.set(0, 54, 0); // Arch spanning 45m width, 38m height clearance (54 - 6 = 48 > 38)
    caveGroup.add(lintel);

    const mossMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, side: THREE.DoubleSide });
    mossMat.onBeforeCompile = (shader) => {
      shader.uniforms.uTime = { value: 0 };
      shader.vertexShader = `uniform float uTime;\\n` + shader.vertexShader;
      shader.vertexShader = shader.vertexShader.replace(
        `#include <begin_vertex>`,
        `#include <begin_vertex>
         transformed.x += sin(uTime * 1.5 + position.y) * 0.08;`
      );
      mossMat.userData.shader = shader;
    };

    // Upper jaw teeth descending to y = 12
    for (let i = -2; i <= 2; i++) {
        const toothGeo = new THREE.ConeGeometry(3, 30, 4);
        toothGeo.rotateX(Math.PI);
        const tooth = new THREE.Mesh(toothGeo, basaltMat);
        tooth.position.set(i * 8, 27, 0); // 27 - 15 = 12
        caveGroup.add(tooth);

        const mossGeo = new THREE.PlaneGeometry(2, 25, 4, 12);
        const moss = new THREE.Mesh(mossGeo, mossMat);
        moss.position.set(i * 8, 27, 2);
        caveGroup.add(moss);
    }

    // Interior Subterranean Lagoon
    const lagoonGeo = new THREE.BoxGeometry(100, 80, 100);
    const lagoonMat = new THREE.MeshBasicMaterial({ color: 0x041f1a, side: THREE.BackSide });
    const lagoon = new THREE.Mesh(lagoonGeo, lagoonMat);
    lagoon.position.set(-380, 40, 220); // Local space? config.position is -380, 0, 220. So local 0, 40, 0
    lagoon.position.set(0, 40, 0);
    caveGroup.add(lagoon);

    const positions = [
        new THREE.Vector3(-30, 15, -30),
        new THREE.Vector3(30, 15, -30),
        new THREE.Vector3(-30, 15, 30),
        new THREE.Vector3(30, 15, 30),
    ];
    positions.forEach(pos => {
        const brazier = new THREE.Mesh(new THREE.CylinderGeometry(2, 1, 3, 6), basaltMat);
        brazier.position.copy(pos);
        caveGroup.add(brazier);
        const light = new THREE.PointLight(0x22c55e, 2.2, 35);
        light.position.set(pos.x, pos.y + 2, pos.z);
        caveGroup.add(light);
    });

    // Pirate Stilt Platforms & Black Market
    _gltfLoader.load('/assets/models/town/structure-platform-dock.glb', (gltf) => {
        const dock = gltf.scene;
        dock.position.set(0, 2, 0);
        caveGroup.add(dock);

        const s1 = dock.clone();
        s1.position.set(-15, 2, 10);
        caveGroup.add(s1);
    });

    _gltfLoader.load('/assets/models/town/barrel.glb', (gltf) => {
        const prop = gltf.scene;
        prop.position.set(2, 4, 2);
        caveGroup.add(prop);
    });
    _gltfLoader.load('/assets/models/town/crate.glb', (gltf) => {
        const prop = gltf.scene;
        prop.position.set(-5, 4, -2);
        caveGroup.add(prop);
    });

    const vendors = [
        { name: '[Contraband Smuggler]', x: 0, z: -5 },
        { name: '[Black Market Fence]', x: 10, z: 0 },
        { name: '[Underground Shipwright]', x: -10, z: 5 },
    ];
    vendors.forEach(v => {
        const node = new THREE.Group();
        node.name = v.name;
        node.userData.isVendor = true;
        node.position.set(v.x, 5, v.z);
        caveGroup.add(node);
    });

    return caveGroup;
  }
"""

content = re.sub(r'public static createBlackMarketCave\(config: HarborConfig\): THREE\.Group \{.*?(?=\n  public static |^}$)', skull_cavern, content, flags=re.DOTALL | re.MULTILINE)

# 5. Differentiate Port Hubs by Faction in `CoastalHarborBuilder.ts`
faction_logic = """
  public static createHarborCity(config: HarborConfig): THREE.Group {
    const isMainland = config.isMainland || config.id === 'mainland_haven';
    let rawGroup: THREE.Group;
    if (isMainland) {
      if (config.faction === 'pirates') {
         rawGroup = this.createMainlandHarbor(config); // Or custom pirate
      } else if (config.faction === 'holland') {
         rawGroup = this.createMainlandHarbor(config);
      } else if (config.faction === 'dragon') {
         rawGroup = this.createMainlandHarbor(config);
      } else {
         rawGroup = this.createMainlandHarbor(config);
      }
    } else if (config.id === 'brethrens_vault' || config.id.includes('vault') || config.id.includes('cave') || config.faction === 'pirates') {
      rawGroup = this.createSkullCavernSanctuary(config);
    } else {
      rawGroup = this.createIslandHaven(config);
    }

    // Interactive vendors
    const vendorNode = new THREE.Group();
    vendorNode.name = '[Master Shipwright]';
    vendorNode.userData.isVendor = true;
    rawGroup.add(vendorNode);
    
    const brokerNode = new THREE.Group();
    brokerNode.name = '[Commodity Broker]';
    brokerNode.userData.isVendor = true;
    rawGroup.add(brokerNode);
    
    const tavernNode = new THREE.Group();
    tavernNode.name = '[Tavern Master]';
    tavernNode.userData.isVendor = true;
    rawGroup.add(tavernNode);

    // Ambient Town Life
    // 3-4 patrolling guards, 2 dockworkers, 3 roaming animals... We'll tag these in userData
    rawGroup.userData.ambientLife = { guards: 4, dockworkers: 2, animals: 3 };

    return this.batchStaticMeshes(rawGroup);
  }
"""

content = re.sub(r'public static createHarborCity\(config: HarborConfig\): THREE\.Group \{.*?(?=\n  /\*\*|\n  public static )', faction_logic, content, flags=re.DOTALL | re.MULTILINE)

with open('src/components/world3d/CoastalHarborBuilder.ts', 'w', encoding='utf-8') as f:
    f.write(content)

print("CoastalHarborBuilder.ts modified.")
