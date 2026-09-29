$src = "C:\Users\library\OneDrive\realm-of-crowns_-medieval-mmo-strategy\_development_artifacts"
$dst = "C:\Users\library\.gemini\antigravity-ide\brain\706e3afe-62d1-40cd-8e24-90bd183e1748"

$files = Get-ChildItem -Path $src -File
foreach ($f in $files) {
    Copy-Item -Path $f.FullName -Destination $dst -Force
    Write-Host "Copied artifact: $($f.Name)"
}
Write-Host "All development artifacts copied to brain directory!"
