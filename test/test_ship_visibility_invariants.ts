import * as THREE from 'three';
import { ShipPresentationOwner } from '../src/shared/movement/ShipPresentationOwner';
import { ShipLODController } from '../src/components/world3d/ShipLODController';
import { VoyageDebugManager } from '../src/components/world3d/VoyageDebugManager';

function assert(cond: boolean, msg: string) {
  if (!cond) {
    console.error(`FAIL: ${msg}`);
    process.exit(1);
  }
  console.log(`[PASS] ${msg}`);
}

console.log('--- Testing Ship Visibility Invariants ---');

// 1. ShipPresentationOwner asserts visibility
const owner = new ShipPresentationOwner();
const testMesh = new THREE.Group();
testMesh.visible = false;
const lod0 = new THREE.Group();
lod0.visible = false;
testMesh.userData = { lodLevels: [lod0], currentLOD: 0 };

owner.applyRenderState(testMesh, null, {
  x: 10, y: 2, z: 30,
  pitch: 0.1, heading: 1.2, roll: -0.05,
  speedKnots: 8, rudder: 0.2, sailSetting: 0.8,
  wakeScale: 1, wakeVisible: true,
  presentationTimestamp: 1000
});

assert(testMesh.visible === true, 'ShipPresentationOwner enforces mesh.visible === true');
assert(lod0.visible === true, 'ShipPresentationOwner enforces active lodLevel visible === true');
assert(testMesh.position.x === 10, 'ShipPresentationOwner sets position.x');

// 2. ShipLODController hero enforcement
testMesh.visible = false;
lod0.visible = false;
ShipLODController.updateShipLOD(testMesh, 50, true);
assert(testMesh.visible === true, 'ShipLODController restores hero shipGroup.visible === true');
assert(lod0.visible === true, 'ShipLODController restores hero lod0.visible === true');

// 3. Debug switch override: toggling shipLODEnabled OFF still ensures visible LOD0
VoyageDebugManager.setSwitch('shipLODEnabled', false);
testMesh.visible = false;
lod0.visible = false;
ShipLODController.updateShipLOD(testMesh, 50, true);
assert(testMesh.visible === true, 'ShipLODController maintains visibility when shipLODEnabled is OFF');
assert(lod0.visible === true, 'ShipLODController maintains LOD0 visibility when shipLODEnabled is OFF');
VoyageDebugManager.setSwitch('shipLODEnabled', true);

// 4. Movement isolation toggle switch presence
assert(VoyageDebugManager.getSwitches().movementIsolationEnabled === true, 'movementIsolationEnabled is true by default');
VoyageDebugManager.setSwitch('movementIsolationEnabled', false);
assert(VoyageDebugManager.getSwitches().movementIsolationEnabled === false, 'movementIsolationEnabled toggles to false cleanly');
VoyageDebugManager.setSwitch('movementIsolationEnabled', true);

console.log('All ship visibility invariant tests passed!');
