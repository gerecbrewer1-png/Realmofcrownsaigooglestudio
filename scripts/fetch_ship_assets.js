const https = require('https');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const url = 'https://kenney.nl/content/3-assets/43-pirate-kit/kenney_pirate-kit.zip';
const destDir = path.join(__dirname, '..', 'public', 'assets', 'models', 'raw');
const destZip = path.join(destDir, 'pirate_kit.zip');

if (!fs.existsSync(destDir)) {
  fs.mkdirSync(destDir, { recursive: true });
}

console.log('Downloading Kenney Pirate Kit...');
console.log('URL:', url);

const file = fs.createWriteStream(destZip);

https.get(url, (response) => {
  if (response.statusCode === 301 || response.statusCode === 302) {
    // Handle redirect if any
    console.log('Following redirect to:', response.headers.location);
    https.get(response.headers.location, (res) => {
      res.pipe(file);
      res.on('end', extractZip);
    });
  } else {
    response.pipe(file);
    file.on('finish', () => {
      file.close();
      extractZip();
    });
  }
}).on('error', (err) => {
  fs.unlink(destZip, () => {});
  console.error('Error downloading:', err.message);
});

function extractZip() {
  console.log('Download complete.');
  console.log('Extracting:', destZip);
  
  try {
    // Windows 10+ includes tar natively which can extract zips
    execSync(`tar -xf "${destZip}" -C "${destDir}"`, { stdio: 'inherit' });
    console.log('Extraction complete.');
    verifyFiles();
  } catch (err) {
    console.log('tar command failed, attempting PowerShell extraction...');
    try {
      execSync(`powershell -command "Expand-Archive -Force -Path '${destZip}' -DestinationPath '${destDir}'"`, { stdio: 'inherit' });
      console.log('Extraction complete.');
      verifyFiles();
    } catch (pwErr) {
      console.error('Failed to extract zip file:', pwErr.message);
    }
  }
}

function verifyFiles() {
  console.log('\nVerifying extracted .glb files...');
  
  const findGlbFiles = (dir) => {
    let results = [];
    const list = fs.readdirSync(dir);
    list.forEach((file) => {
      const filePath = path.join(dir, file);
      const stat = fs.statSync(filePath);
      if (stat && stat.isDirectory()) {
        results = results.concat(findGlbFiles(filePath));
      } else if (file.endsWith('.glb') || file.endsWith('.gltf')) {
        results.push(filePath);
      }
    });
    return results;
  };

  const glbFiles = findGlbFiles(destDir);
  if (glbFiles.length > 0) {
    console.log(`Success! Found ${glbFiles.length} GLB/GLTF models.`);
    console.log('Example files:');
    glbFiles.slice(0, 5).forEach(f => console.log(' - ' + path.relative(destDir, f)));
  } else {
    console.warn('Warning: No .glb or .gltf files found in the extracted archive.');
  }
}
