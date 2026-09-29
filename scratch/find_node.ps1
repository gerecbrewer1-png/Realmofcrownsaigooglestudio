$searchDirs = @(
    'C:\Program Files',
    'C:\Program Files (x86)',
    'C:\Users\library\AppData\Local',
    'C:\Users\library\AppData\Roaming',
    'C:\Users\library\.gemini'
)

foreach ($dir in $searchDirs) {
    if (Test-Path $dir) {
        $found = Get-ChildItem -Path $dir -Filter 'node.exe' -Recurse -Depth 4 -ErrorAction SilentlyContinue
        foreach ($f in $found) {
            Write-Host "FOUND: $($f.FullName)"
        }
    }
}
