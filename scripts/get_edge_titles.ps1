Get-Process msedge -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.MainWindowTitle) {
        Write-Host "Edge Window: $($_.MainWindowTitle)"
    }
}

Get-Process chrome -ErrorAction SilentlyContinue | ForEach-Object {
    if ($_.MainWindowTitle) {
        Write-Host "Chrome Window: $($_.MainWindowTitle)"
    }
}
