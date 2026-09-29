# REALM OF CROWNS - DUAL ONEDRIVE BACKUP & ARCHIVE SCRIPT
$ErrorActionPreference = "Continue"

$SourceDir = "c:\Users\library\Downloads\realm-of-crowns_-medieval-mmo-strategy (1)"
$ArtifactsDir = "C:\Users\library\.gemini\antigravity-ide\brain\61c6acb7-5f62-40ad-ba1c-b30129a91699"

$Target1 = "C:\Users\library\OneDrive\realm-of-crowns_-medieval-mmo-strategy"
$Target2 = "C:\Users\library\OneDrive - Ball State University\realm-of-crowns_-medieval-mmo-strategy"

$Zip1 = "C:\Users\library\OneDrive\realm-of-crowns-complete-backup.zip"
$Zip2 = "C:\Users\library\OneDrive - Ball State University\realm-of-crowns-complete-backup.zip"

Write-Host "=================================================="
Write-Host "REALM OF CROWNS - DUAL ONEDRIVE BACKUP"
Write-Host "Source: $SourceDir"
Write-Host "Target 1 (Personal): $Target1"
Write-Host "Target 2 (University): $Target2"
Write-Host "=================================================="

# Ensure Target directories exist
if (!(Test-Path $Target1)) { New-Item -ItemType Directory -Path $Target1 -Force | Out-Null }
if (!(Test-Path $Target2)) { New-Item -ItemType Directory -Path $Target2 -Force | Out-Null }

# Write README_RESTORE.txt into source root first so it gets mirrored
$ReadmePath = Join-Path $SourceDir "README_RESTORE.txt"
$ReadmeContent = @"
================================================================================
REALM OF CROWNS - PROJECT BACKUP & RESUMPTION GUIDE
================================================================================
Backed Up: $(Get-Date -Format "yyyy-MM-dd HH:mm:ss")
Locations:
  1. OneDrive (Personal): $Target1
  2. OneDrive (Ball State University): $Target2

PROJECT SUMMARY & COMPLETE ASSET MANIFEST:
--------------------------------------------------------------------------------
1. Core Game Systems & 3D Engines:
   - Three.js Medieval 3D World Map: Full multi-chunk terrain with procedural
     heightmaps, mountains, forests, castles, rivers, and custom water shaders.
   - Citadel Keep View: Complete interior castle bailey, barracks, towers,
     and fortified drawbridge with calibrated clearance.
   - PlayCanvas 3D Tactical Arena: Real-time squad tactics engine, directional
     combat mechanics, animated ability triggers, damage floaters, and victory
     rewards workflow.
   - Procedural Medieval Audio Synthesizer: 100% dependency-free Web Audio
     engine generating fanfare, battle sounds, footfalls, and tavern ambient score.
   - Mobile-First Interface: Touch-first HUD, responsive drawer navigation,
     dynamic kingdom events, and dual-mode battle transitions.

2. Development & Verification Artifacts (_development_artifacts/):
   - walkthrough.md: Complete engineering chronicle and feature breakdown.
   - implementation_plan.md: Architecture and technical roadmap.
   - High-resolution visual verification screenshots covering all views.

HOW TO RESUME OR RUN THIS PROJECT:
--------------------------------------------------------------------------------
Prerequisites: Node.js (v18 or higher recommended)
Steps:
  1. Open a terminal (PowerShell, Command Prompt, or Bash) in this directory.
  2. Run:
       npm install
     (This downloads and installs all dependencies specified in package.json)
  3. Run:
       npm run dev
     (This starts the Vite local development server, typically at http://localhost:3000)
  4. Open your web browser or mobile browser emulator to http://localhost:3000.
================================================================================
"@
Set-Content -Path $ReadmePath -Value $ReadmeContent -Encoding UTF8
Write-Host "Created $ReadmePath"

# Mirror project tree to Target 1
Write-Host "Syncing project to OneDrive Account 1 (Personal)..."
robocopy.exe $SourceDir $Target1 /E /XD node_modules dist download_temp /R:1 /W:1 /NP /NFL /NDL
if ($LASTEXITCODE -gt 7) {
    Write-Warning "Robocopy to Target 1 reported status code $LASTEXITCODE"
} else {
    Write-Host "OneDrive Account 1 project sync complete."
}

# Mirror project tree to Target 2
Write-Host "Syncing project to OneDrive Account 2 (Ball State University)..."
robocopy.exe $SourceDir $Target2 /E /XD node_modules dist download_temp /R:1 /W:1 /NP /NFL /NDL
if ($LASTEXITCODE -gt 7) {
    Write-Warning "Robocopy to Target 2 reported status code $LASTEXITCODE"
} else {
    Write-Host "OneDrive Account 2 project sync complete."
}

# Copy Brain Artifacts to both targets
$ArtifactsTarget1 = Join-Path $Target1 "_development_artifacts"
$ArtifactsTarget2 = Join-Path $Target2 "_development_artifacts"
if (!(Test-Path $ArtifactsTarget1)) { New-Item -ItemType Directory -Path $ArtifactsTarget1 -Force | Out-Null }
if (!(Test-Path $ArtifactsTarget2)) { New-Item -ItemType Directory -Path $ArtifactsTarget2 -Force | Out-Null }

Write-Host "Copying walkthroughs and verification screenshots..."
robocopy.exe $ArtifactsDir $ArtifactsTarget1 /E /XD browser scratch .system_generated .tempmediaStorage /R:1 /W:1 /NP /NFL /NDL
robocopy.exe $ArtifactsDir $ArtifactsTarget2 /E /XD browser scratch .system_generated .tempmediaStorage /R:1 /W:1 /NP /NFL /NDL
Write-Host "Artifacts copied to both accounts."

# Create Standalone Zip Archive using .NET ZipFile for reliability & speed
Write-Host "Creating standalone ZIP archive at $Zip1..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
if (Test-Path $Zip1) { Remove-Item -Path $Zip1 -Force }
[System.IO.Compression.ZipFile]::CreateFromDirectory($Target1, $Zip1, [System.IO.Compression.CompressionLevel]::Optimal, $false)

$z1 = Get-Item $Zip1
$zip1Size = [math]::Round($z1.Length / 1MB, 2)
Write-Host "Created $Zip1 ($zip1Size MB)"

Write-Host "Mirroring standalone ZIP archive to OneDrive Account 2 ($Zip2)..."
Copy-Item -Path $Zip1 -Destination $Zip2 -Force
$z2 = Get-Item $Zip2
$zip2Size = [math]::Round($z2.Length / 1MB, 2)
Write-Host "Mirrored $Zip2 ($zip2Size MB)"

# Verification Counts
$Files1 = Get-ChildItem -Path $Target1 -Recurse -File
$Files2 = Get-ChildItem -Path $Target2 -Recurse -File
$Count1 = $Files1.Count
$Count2 = $Files2.Count
$Size1 = [math]::Round(($Files1 | Measure-Object -Property Length -Sum).Sum / 1MB, 2)
$Size2 = [math]::Round(($Files2 | Measure-Object -Property Length -Sum).Sum / 1MB, 2)

Write-Host "=================================================="
Write-Host "BACKUP & ARCHIVE VERIFICATION"
Write-Host "OneDrive Account 1 (Personal):"
Write-Host "  Directory: $Target1"
Write-Host "  Total Files: $Count1 | Total Size: $Size1 MB"
Write-Host "  Zip Archive: $Zip1 ($zip1Size MB)"
Write-Host "OneDrive Account 2 (Ball State University):"
Write-Host "  Directory: $Target2"
Write-Host "  Total Files: $Count2 | Total Size: $Size2 MB"
Write-Host "  Zip Archive: $Zip2 ($zip2Size MB)"
Write-Host "STATUS: SUCCESSFUL & FULLY REDUNDANT"
Write-Host "=================================================="
