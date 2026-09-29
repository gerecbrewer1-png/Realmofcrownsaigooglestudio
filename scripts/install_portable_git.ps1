$targetDir = "C:\Users\gerec.brewer\.tools\git"
if (Test-Path "$targetDir\cmd\git.exe") {
    Write-Host "Portable git already installed at $targetDir\cmd\git.exe"
    exit 0
}

New-Item -ItemType Directory -Path $targetDir -Force | Out-Null
$zipPath = "$env:TEMP\MinGit.zip"

Write-Host "Downloading MinGit portable (zero admin required)..."
$url = "https://github.com/git-for-windows/git/releases/download/v2.44.0.windows.1/MinGit-2.44.0-64-bit.zip"

[Net.ServicePointManager]::SecurityProtocol = [Net.SecurityProtocolType]::Tls12
Invoke-WebRequest -Uri $url -OutFile $zipPath -UseBasicParsing

Write-Host "Extracting MinGit..."
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::ExtractToDirectory($zipPath, $targetDir)
Remove-Item -Path $zipPath -Force -ErrorAction SilentlyContinue

Write-Host "Testing git.exe:"
& "$targetDir\cmd\git.exe" --version
