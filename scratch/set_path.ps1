$nodeDir = "C:\Program Files\nodejs"
$currentPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$nodeDir*") {
    $newPath = "$nodeDir;$currentPath"
    [System.Environment]::SetEnvironmentVariable("Path", $newPath, "User")
    Write-Host "Added $nodeDir to User PATH."
} else {
    Write-Host "$nodeDir already in User PATH."
}

# Test direct node execution
& "$nodeDir\node.exe" -v
& "$nodeDir\node.exe" "$nodeDir\node_modules\npm\bin\npm-cli.js" -v
