$f1 = "node_modules\lucide-react\dist\esm\defaultAttributes.js"
$f2 = "node_modules\lucide-react\dist\esm\shared\src\utils.js"
Write-Host "Checking lucide-react files..."
try {
    $b1 = [System.IO.File]::ReadAllBytes($f1)
    Write-Host "Read $f1 successfully: $($b1.Length) bytes."
    $b2 = [System.IO.File]::ReadAllBytes($f2)
    Write-Host "Read $f2 successfully: $($b2.Length) bytes."
} catch {
    Write-Host "Failed to read: $_"
}
