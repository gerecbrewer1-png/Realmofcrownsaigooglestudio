$targetDir = "C:\Users\gerec.brewer\.tools\git"
New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
$zipPath = "$env:TEMP\MinGit.zip"

Write-Host "Downloading MinGit via curl.exe..."
& "C:\Windows\System32\curl.exe" -L -o "$zipPath" "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip"

Write-Host "Extracting MinGit to $targetDir..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $targetDir)
Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue

Write-Host "Verifying git version:"
& "$targetDir\cmd\git.exe" --version
