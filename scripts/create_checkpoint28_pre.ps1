$ErrorActionPreference = "Continue"

$SourceDir = "C:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint24"
$ZipTarget = "C:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint28_pre_transport.zip"

Write-Host "Creating Checkpoint 28 Pre-Transport Archive (Preserving Phase 2.7 State)..."

$TempStaging = "$env:TEMP\checkpoint28_pre_staging"
$TempZip = "$env:TEMP\checkpoint28_pre_transport.zip"

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

Write-Host "Copying to OneDrive target: $ZipTarget"
Copy-Item -Path $TempZip -Destination $ZipTarget -Force

Write-Host "Cleaning up staging..."
Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TempStaging -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Checkpoint 28 pre-transport archive created successfully:"
Get-Item $ZipTarget | Select-Object Name, Length, LastWriteTime
