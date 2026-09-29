$parent = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Write-Host "OneDrive Directory: $parent"

Get-ChildItem -Path $parent -Directory | ForEach-Object {
    $dirName = $_.Name
    $dirPath = $_.FullName
    $files = Get-ChildItem -Path $dirPath -Recurse -File -ErrorAction SilentlyContinue
    $totalBytes = ($files | Measure-Object -Property Length -Sum).Sum
    if (-not $totalBytes) { $totalBytes = 0 }
    [PSCustomObject]@{
        Folder = $dirName
        SizeMB = [math]::Round($totalBytes / 1MB, 2)
        FilesCount = ($files | Measure-Object).Count
        LastModified = $_.LastWriteTime
    }
} | Format-Table -AutoSize
