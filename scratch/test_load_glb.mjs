import * as pc from 'playcanvas';
import fs from 'fs';

console.log('Testing PlayCanvas GLB Loading...');
// Verify GLB file exists on disk
const keepPath = 'public/assets/medieval/buildings/keep.glb';
const warlordPath = 'public/assets/medieval/heroes/warlord.glb';
console.log('Keep GLB size:', fs.statSync(keepPath).size);
console.log('Warlord GLB size:', fs.statSync(warlordPath).size);
