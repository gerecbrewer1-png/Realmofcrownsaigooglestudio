$dir = "node_modules\three-stdlib"
Write-Host "Hydrating $dir..."
$files = Get-ChildItem -Path $dir -Recurse -File -Filter "*.js"
$c = 0
foreach ($f in $files) {
    try {
        [System.IO.File]::ReadAllBytes($f.FullName) | Out-Null
        $c++
    } catch {}
}
Write-Host "Hydrated $c js files in $dir."
