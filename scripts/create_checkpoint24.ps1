$ErrorActionPreference = "Continue"

$SourceDir = "C:\Users\gerec.brewer\OneDrive - Ball State University\realm-of-crowns_-medieval-mmo-strategy"
$ZipTarget1 = "C:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint24.zip"
$ZipTarget2 = Join-Path $SourceDir "_development_artifacts\checkpoint24.zip"

Write-Host "Creating Checkpoint 24 Archive..."

$TempStaging = "$env:TEMP\checkpoint24_staging"
$TempZip = "$env:TEMP\checkpoint24.zip"

if (Test-Path $TempStaging) {
    Remove-Item -Path $TempStaging -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path $TempZip) {
    Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $TempStaging -Force | Out-Null

Write-Host "Staging files with robocopy..."
robocopy.exe "$SourceDir" "$TempStaging" /E /XD node_modules .git dist .vite /XF *.zip /R:1 /W:1 /NP /NFL /NDL | Out-Null

Write-Host "Compressing stage directory..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TempStaging, $TempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Write-Host "Copying to OneDrive targets..."
Copy-Item -Path $TempZip -Destination $ZipTarget1 -Force
Copy-Item -Path $TempZip -Destination $ZipTarget2 -Force

Write-Host "Cleaning up staging..."
Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TempStaging -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Checkpoint 24 verified:"
Get-Item $ZipTarget1 | Select-Object FullName, Length, LastWriteTime
Get-Item $ZipTarget2 | Select-Object FullName, Length, LastWriteTime
