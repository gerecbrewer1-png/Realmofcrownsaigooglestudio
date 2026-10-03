const fs = require('fs');
const https = require('https');
const path = require('path');
const { execSync } = require('child_process');

const targetDir = path.join(__dirname, '../public/assets/models/raw');

// Create directory if it doesn't exist
if (!fs.existsSync(targetDir)) {
    fs.mkdirSync(targetDir, { recursive: true });
}

// 1. Download Duck.glb
const duckUrl = 'https://raw.githubusercontent.com/KhronosGroup/glTF-Sample-Models/master/2.0/Duck/glTF-Binary/Duck.glb';
const duckDest = path.join(targetDir, 'ship-junk.glb');

console.log('Downloading Duck.glb...');
https.get(duckUrl, (res) => {
    const file = fs.createWriteStream(duckDest);
    res.pipe(file);
    file.on('finish', () => {
        file.close();
        console.log('Downloaded Duck.glb -> ship-junk.glb');
    });
}).on('error', (err) => {
    console.error('Error downloading Duck.glb:', err.message);
});

// 2. Extract pirate_kit.zip using PowerShell
const zipPath = path.join(targetDir, 'pirate_kit.zip');
const extractDir = path.join(targetDir, 'pirate_kit_extracted');

try {
    if (fs.existsSync(zipPath)) {
        console.log('Extracting pirate_kit.zip...');
        execSync(`powershell -Command "Expand-Archive -Path '${zipPath}' -DestinationPath '${extractDir}' -Force"`);
        console.log('Extraction complete. Searching for ships...');
        
        const fileMappings = [
            { src: 'ship_sloop', dest: 'ship_sloop.glb' },
            { src: 'ship_corvette', dest: 'ship_corvette.glb' },
            { src: 'ship_frigate', dest: 'ship_frigate.glb' },
            { src: 'ship_galleon', dest: 'ship_galleon.glb' },
            { src: 'ship_dark', dest: 'ship_pirate_large.glb' }, // some mappings if available
            { src: 'ship_light', dest: 'ship-small.glb' }
        ];
        
        function findFile(dir, baseName) {
            const files = fs.readdirSync(dir);
            for (const file of files) {
                const fullPath = path.join(dir, file);
                if (fs.statSync(fullPath).isDirectory()) {
                    const found = findFile(fullPath, baseName);
                    if (found) return found;
                } else if (file.toLowerCase() === baseName.toLowerCase() + '.glb' || file.toLowerCase() === baseName.toLowerCase() + '.gltf') {
                    return fullPath;
                }
            }
            return null;
        }

        for (const mapping of fileMappings) {
            const srcPath = findFile(extractDir, mapping.src);
            if (srcPath) {
                const destPath = path.join(targetDir, mapping.dest);
                fs.copyFileSync(srcPath, destPath);
                console.log(`Copied ${path.basename(srcPath)} -> ${mapping.dest}`);
            } else {
                console.log(`Could not find ${mapping.src} in extracted files.`);
            }
        }
    } else {
        console.log('pirate_kit.zip not found.');
    }
} catch (error) {
    console.error('Extraction failed:', error.message);
}
