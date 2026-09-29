$targets = @(
    "src",
    "public",
    "node_modules\three",
    "node_modules\three-stdlib",
    "node_modules\lucide-react",
    "node_modules\playcanvas"
)

foreach ($target in $targets) {
    if (Test-Path $target) {
        Write-Host "Hydrating $target..."
        $files = Get-ChildItem -Path $target -Recurse -File -ErrorAction SilentlyContinue
        $count = 0
        foreach ($f in $files) {
            try {
                # Reading 1 byte triggers OneDrive file download/hydration
                $fs = [System.IO.File]::OpenRead($f.FullName)
                $fs.ReadByte() | Out-Null
                $fs.Close()
                $count++
            } catch {
                # ignore
            }
        }
        Write-Host "Hydrated $count files in $target."
    }
}
Write-Host "All key dependencies hydrated!"
