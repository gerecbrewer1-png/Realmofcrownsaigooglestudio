$ErrorActionPreference = "Stop"

$url = "https://kenney.nl/content/3-assets/11-medieval-town-base/kenney_medieval-town-base.zip"
$rawDir = "public/assets/models/raw"
$zipPath = "$rawDir/town_kit.zip"
$extractDir = "$rawDir/town_extracted"
$destDir = "public/assets/models/town"

New-Item -ItemType Directory -Force -Path $rawDir | Out-Null
New-Item -ItemType Directory -Force -Path $destDir | Out-Null

Write-Host "Downloading $url to $zipPath..."
Invoke-WebRequest -Uri $url -OutFile $zipPath

Write-Host "Extracting $zipPath to $extractDir..."
if (Test-Path $extractDir) {
    Remove-Item -Recurse -Force $extractDir
}
Expand-Archive -Path $zipPath -DestinationPath $extractDir -Force

Write-Host "Copying .glb files to $destDir..."
# Kenney assets might be named GLTF format or similar, let's find all .glb files recursively
$glbs = Get-ChildItem -Path $extractDir -Filter "*.glb" -Recurse
if ($glbs.Count -gt 0) {
    $glbs | Copy-Item -Destination $destDir -Force
    Write-Host "Successfully copied $($glbs.Count) .glb files to $destDir."
} else {
    Write-Host "No .glb files found! Let's check for .gltf..."
    # If no glb, maybe there are only .gltf
    $gltfs = Get-ChildItem -Path $extractDir -Filter "*.gltf" -Recurse
    if ($gltfs.Count -gt 0) {
        $gltfs | Copy-Item -Destination $destDir -Force
        Write-Host "Copied $($gltfs.Count) .gltf files to $destDir. (Consider converting to .glb)"
    } else {
        Write-Host "No .glb or .gltf files found!"
    }
}

Write-Host "Listing contents of $destDir :"
Get-ChildItem -Path $destDir | Select-Object Name
