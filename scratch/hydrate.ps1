$file = "node_modules\three-stdlib\shaders\HorizontalTiltShiftShader.js"
Write-Host "Testing read of $file..."
try {
    # Force read content to trigger hydration
    $bytes = [System.IO.File]::ReadAllBytes($file)
    Write-Host "Successfully read $($bytes.Length) bytes!"
} catch {
    Write-Host "Read failed: $_"
}
