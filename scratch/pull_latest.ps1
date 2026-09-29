$src = 'C:\Users\library\OneDrive - Ball State University\realm-of-crowns_-medieval-mmo-strategy'
$dst = 'C:\Users\library\OneDrive\realm-of-crowns_-medieval-mmo-strategy'

Write-Host "Pulling files from BSU OneDrive to Personal workspace..."
$srcFiles = Get-ChildItem -Path $src -Recurse -File | Where-Object { $_.FullName -notmatch 'node_modules' }
$copiedCount = 0

foreach ($f in $srcFiles) {
    $rel = $f.FullName.Substring($src.Length)
    $target = $dst + $rel
    if (-not (Test-Path $target)) {
        $parent = Split-Path -Parent $target
        if (-not (Test-Path $parent)) {
            New-Item -ItemType Directory -Path $parent -Force | Out-Null
        }
        Copy-Item -Path $f.FullName -Destination $target -Force
        Write-Host "Copied missing: $rel"
        $copiedCount++
    } else {
        $tItem = Get-Item $target
        # Only copy if source is strictly newer AND destination is NOT in src/ (where Personal has latest edits)
        if ($f.LastWriteTime -gt $tItem.LastWriteTime -and -not ($rel.StartsWith('\src\'))) {
            Copy-Item -Path $f.FullName -Destination $target -Force
            Write-Host "Updated with newer: $rel"
            $copiedCount++
        }
    }
}

Write-Host "Finished pulling files! Total files copied/updated: $copiedCount"
