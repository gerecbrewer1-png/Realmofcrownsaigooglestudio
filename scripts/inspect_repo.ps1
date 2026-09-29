$target = "C:\Users\gerec.brewer\OneDrive - Ball State University\realm-of-crowns_-medieval-mmo-strategy"
$hasGit = Test-Path (Join-Path $target ".git")
Write-Host "Target: $target"
Write-Host ".git exists: $hasGit"

if ($hasGit) {
    $cfgPath = Join-Path $target ".git\config"
    if (Test-Path $cfgPath) {
        Write-Host "--- .git/config ---"
        Get-Content $cfgPath
    }
    $headPath = Join-Path $target ".git\HEAD"
    if (Test-Path $headPath) {
        Write-Host "--- .git/HEAD ---"
        Get-Content $headPath
    }
}
