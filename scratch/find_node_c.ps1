$drives = @('C:\')
foreach ($d in $drives) {
    Write-Host "Searching $d for node.exe..."
    Get-ChildItem -Path $d -Filter 'node.exe' -Recurse -Depth 4 -ErrorAction SilentlyContinue | ForEach-Object {
        Write-Host "FOUND: $($_.FullName)"
    }
}
