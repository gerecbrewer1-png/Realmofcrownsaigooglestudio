$ErrorActionPreference = "Continue"

$SourceDir = "C:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint24"
$ZipTarget1 = "C:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint26.zip"

Write-Host "Creating Checkpoint 26 Archive (Phase 2.6 Simulation LOD & Large-Fleet Foundation)..."

$TempStaging = "$env:TEMP\checkpoint26_staging"
$TempZip = "$env:TEMP\checkpoint26.zip"

if (Test-Path $TempStaging) {
    Remove-Item -Path $TempStaging -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path $TempZip) {
    Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $TempStaging -Force | Out-Null

Write-Host "Staging files with robocopy..."
robocopy.exe "$SourceDir" "$TempStaging" /E /XD node_modules .git dist .vite .system_generated /XF *.zip *.log /R:1 /W:1 /NP /NFL /NDL | Out-Null

Write-Host "Compressing stage directory..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TempStaging, $TempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Write-Host "Copying to OneDrive target: $ZipTarget1"
Copy-Item -Path $TempZip -Destination $ZipTarget1 -Force

Write-Host "Cleaning up staging..."
Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TempStaging -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Checkpoint 26 archive verified successfully:"
Get-Item $ZipTarget1 | Select-Object Name, Length, LastWriteTime
