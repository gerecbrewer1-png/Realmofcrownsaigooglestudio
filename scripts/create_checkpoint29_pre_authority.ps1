$ErrorActionPreference = "Continue"

$SourceDir = "C:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint24"
$ZipTarget = "C:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint29_pre_authority.zip"

Write-Host "Creating Checkpoint 29 Pre-Authority Archive..." -ForegroundColor Cyan

$TempStaging = "$env:TEMP\checkpoint29_pre_auth_staging"
$TempZip = "$env:TEMP\checkpoint29_pre_authority.zip"

if (Test-Path $TempStaging) {
    Remove-Item -Path $TempStaging -Recurse -Force -ErrorAction SilentlyContinue
}
if (Test-Path $TempZip) {
    Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
}

New-Item -ItemType Directory -Path $TempStaging -Force | Out-Null

Write-Host "Staging files with robocopy..."
robocopy.exe "$SourceDir" "$TempStaging" /E /XD node_modules dist .vite .system_generated /XF *.zip *.log /R:1 /W:1 /NP /NFL /NDL | Out-Null

Write-Host "Compressing stage directory..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($TempStaging, $TempZip, [System.IO.Compression.CompressionLevel]::Optimal, $false)

Write-Host "Copying to OneDrive target: $ZipTarget"
Copy-Item -Path $TempZip -Destination $ZipTarget -Force

Write-Host "Cleaning up staging..."
Remove-Item -Path $TempZip -Force -ErrorAction SilentlyContinue
Remove-Item -Path $TempStaging -Recurse -Force -ErrorAction SilentlyContinue

Write-Host "Checkpoint 29 Pre-Authority archive created successfully:" -ForegroundColor Green
Get-Item $ZipTarget | Select-Object Name, Length, LastWriteTime
