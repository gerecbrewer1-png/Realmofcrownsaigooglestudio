$ErrorActionPreference = "Stop"
$rawDir = "public/assets/models/raw"
$townDir = "public/assets/models/town"
New-Item -ItemType Directory -Force -Path $townDir

# 1. Download active Fantasy Town Kit
$townZip = "$rawDir/fantasy_town.zip"
$townExtracted = "$rawDir/fantasy_town_extracted"

try {
    Write-Host "Downloading Fantasy Town Kit..."
    Invoke-WebRequest -Uri "https://kenney.nl/content/3-assets/35-fantasy-town-kit/kenney_fantasy-town-kit.zip" -OutFile $townZip
    Write-Host "Extracting Fantasy Town Kit..."
    Expand-Archive -Path $townZip -DestinationPath $townExtracted -Force
} catch {
    Write-Host "Error downloading or extracting Fantasy Town Kit: $_"
}

# 2. Copy GLB buildings into public/assets/models/town/
if (Test-Path $townExtracted) {
    Get-ChildItem -Path "$townExtracted" -Recurse -Filter "*.glb" | Copy-Item -Destination $townDir -Force
}

# 3. Harvest dock props, barrels, and pier pieces from the existing pirate archive
if (Test-Path "$rawDir/pirate_kit_extracted") {
    Write-Host "Harvesting dock props from pirate kit..."
    Get-ChildItem -Path "$rawDir/pirate_kit_extracted" -Recurse -Filter "*dock*.glb" | Copy-Item -Destination $townDir -Force
    Get-ChildItem -Path "$rawDir/pirate_kit_extracted" -Recurse -Filter "*barrel*.glb" | Copy-Item -Destination $townDir -Force
    Get-ChildItem -Path "$rawDir/pirate_kit_extracted" -Recurse -Filter "*crate*.glb" | Copy-Item -Destination $townDir -Force
} else {
    Write-Host "pirate_kit_extracted not found!"
}

Write-Host "Contents of $townDir :"
Get-ChildItem -Path $townDir -Filter "*.glb" | Select-Object Name
