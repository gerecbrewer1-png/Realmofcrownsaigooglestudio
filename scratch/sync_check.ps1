$src = 'C:\Users\library\OneDrive - Ball State University\realm-of-crowns_-medieval-mmo-strategy'
$dst = 'C:\Users\library\OneDrive\realm-of-crowns_-medieval-mmo-strategy'

Write-Host "Checking for files in BSU that are missing or newer in Personal..."
$srcFiles = Get-ChildItem -Path $src -Recurse -File | Where-Object { $_.FullName -notmatch 'node_modules' }
$newerInBSU = @()
$missingInPersonal = @()

foreach ($f in $srcFiles) {
    $rel = $f.FullName.Substring($src.Length)
    $target = $dst + $rel
    if (-not (Test-Path $target)) {
        $missingInPersonal += $rel
    } else {
        $tItem = Get-Item $target
        if ($f.LastWriteTime -gt $tItem.LastWriteTime) {
            $newerInBSU += "$rel (BSU: $($f.LastWriteTime) vs Personal: $($tItem.LastWriteTime))"
        }
    }
}

Write-Host "Missing in Personal: $($missingInPersonal.Count)"
foreach ($m in $missingInPersonal) {
    Write-Host "  + $m"
}

Write-Host "Newer in BSU: $($newerInBSU.Count)"
foreach ($n in $newerInBSU) {
    Write-Host "  * $n"
}

Write-Host "----------------------------------"
Write-Host "Checking for files in Personal that are missing or newer than BSU..."
$dstFiles = Get-ChildItem -Path $dst -Recurse -File | Where-Object { $_.FullName -notmatch 'node_modules' }
$newerInPersonal = @()
$missingInBSU = @()

foreach ($f in $dstFiles) {
    $rel = $f.FullName.Substring($dst.Length)
    $target = $src + $rel
    if (-not (Test-Path $target)) {
        $missingInBSU += $rel
    } else {
        $tItem = Get-Item $target
        if ($f.LastWriteTime -gt $tItem.LastWriteTime) {
            $newerInPersonal += "$rel (Personal: $($f.LastWriteTime) vs BSU: $($tItem.LastWriteTime))"
        }
    }
}

Write-Host "Missing in BSU: $($missingInBSU.Count)"
foreach ($m in $missingInBSU) {
    Write-Host "  + $m"
}

Write-Host "Newer in Personal: $($newerInPersonal.Count)"
foreach ($n in $newerInPersonal) {
    Write-Host "  * $n"
}
