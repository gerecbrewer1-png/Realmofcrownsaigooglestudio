$env:PATH = "C:\Program Files\nodejs;$env:PATH"
# Also ensure User PATH permanently contains nodejs
$userPath = [System.Environment]::GetEnvironmentVariable("Path", "User")
if ($userPath -notmatch "C:\\Program Files\\nodejs") {
    [System.Environment]::SetEnvironmentVariable("Path", "C:\Program Files\nodejs;$userPath", "User")
}

Write-Host "Node version:" (node -v)
Write-Host "NPM version:" (npm -v)
Write-Host "Starting server on port 3000..."
npm run dev
