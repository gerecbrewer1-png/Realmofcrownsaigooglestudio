Add-Type -AssemblyName System.IO.Compression.FileSystem

$tpzPath = Join-Path $env:TEMP "godot_templates.tpz"
$targetDir = Join-Path $env:APPDATA "Godot\export_templates\4.7.2.stable"

if (-not (Test-Path $targetDir)) {
    New-Item -ItemType Directory -Force -Path $targetDir | Out-Null
}

Write-Host "Opening $tpzPath..."
$zip = [System.IO.Compression.ZipFile]::OpenRead($tpzPath)

Write-Host "Extracting templates..."
foreach ($entry in $zip.Entries) {
    if ($entry.FullName.StartsWith("templates/") -and ($entry.Name.StartsWith("web_") -or $entry.Name -eq "version.txt")) {
        $dest = Join-Path $targetDir $entry.Name
        [System.IO.Compression.ZipFileExtensions]::ExtractToFile($entry, $dest, $true)
        Write-Host "Extracted: $($entry.Name) ($([math]::Round($entry.Length / 1MB, 2)) MB)"
    }
}

$zip.Dispose()
Write-Host "Done! Files in $targetDir :"
Get-ChildItem $targetDir | Select-Object Name, Length
