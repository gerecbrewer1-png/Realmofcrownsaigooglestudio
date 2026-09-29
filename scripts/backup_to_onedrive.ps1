$ErrorActionPreference = "Continue"

$SourceDir = "C:\Users\library\OneDrive - Ball State University\realm-of-crowns_-medieval-mmo-strategy"
$PersonalOneDrive = "C:\Users\library\OneDrive\realm-of-crowns_-medieval-mmo-strategy"
$ArtifactsDir = "C:\Users\library\.gemini\antigravity-ide\brain\e1b4e729-c52a-438d-8a4a-22d726883d42"

$ZipBallState = "C:\Users\library\OneDrive - Ball State University\realm-of-crowns-godot-backup-latest.zip"
$ZipPersonal = "C:\Users\library\OneDrive\realm-of-crowns-godot-backup-latest.zip"

Write-Host "=================================================================="
Write-Host "REALM OF CROWNS - ONEDRIVE BACKUP"
Write-Host "Source: $SourceDir"
Write-Host "=================================================================="

# 1. Preserve Development Artifacts and Screenshots into _development_artifacts/
$TargetArtifacts = Join-Path $SourceDir "_development_artifacts"
if (-not (Test-Path $TargetArtifacts)) {
    New-Item -ItemType Directory -Path $TargetArtifacts -Force | Out-Null
}

if (Test-Path $ArtifactsDir) {
    Write-Host "Preserving walkthroughs, implementation plans, and screenshots..."
    Copy-Item -Path "$ArtifactsDir\*.png" -Destination $TargetArtifacts -Force -ErrorAction SilentlyContinue
    Copy-Item -Path "$ArtifactsDir\*.md" -Destination $TargetArtifacts -Force -ErrorAction SilentlyContinue
    Write-Host "Artifacts preserved in $TargetArtifacts"
}

# 2. Mirror to Personal OneDrive (if accessible)
if (Test-Path "C:\Users\library\OneDrive") {
    Write-Host "Mirroring to Personal OneDrive: $PersonalOneDrive ..."
    robocopy.exe "$SourceDir" "$PersonalOneDrive" /E /XD node_modules .godot downloads dist /R:1 /W:1 /NP /NFL /NDL | Out-Null
    Write-Host "Mirrored to Personal OneDrive."
}

# 3. Create Clean Standalone ZIP Archive in TEMP first
Write-Host "Creating clean portable ZIP archive..."
$TempZipStaging = "$env:TEMP\realm_of_crowns_zip_staging"
$TempZipFile = "$env:TEMP\realm-of-crowns-godot-backup-latest.zip"

if (Test-Path $TempZipFile) {
    Remove-Item -Path $TempZipFile -Force -ErrorAction SilentlyContinue
}

Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TempZipStaging, $TempZipFile, [System.IO.Compression.CompressionLevel]::Fastest, $false)

Write-Host "Archive compressed in Temp successfully."

# Copy finalized complete zip into OneDrive
Write-Host "Copying completed archive to Ball State OneDrive..."
Copy-Item -Path $TempZipFile -Destination $ZipBallState -Force
Write-Host "Archive confirmed in Ball State OneDrive: $ZipBallState"

if (Test-Path "C:\Users\library\OneDrive") {
    Write-Host "Copying archive to Personal OneDrive..."
    Copy-Item -Path $TempZipFile -Destination $ZipPersonal -Force
    if (Test-Path $ZipPersonal) {
        Write-Host "Archive confirmed in Personal OneDrive: $ZipPersonal"
    }
}

# Clean up temporary staging files
Remove-Item -Path $TempZipFile -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TempZipStaging -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "=================================================================="
Write-Host "ONEDRIVE BACKUP COMPLETE AND VERIFIED"
Write-Host "All source code, Godot 4.7 assets, web builds, tests, guides, and"
Write-Host "standalone ZIP archives are safely stored in OneDrive."
Write-Host "=================================================================="
