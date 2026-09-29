$env:PATH = "C:\Program Files\nodejs;$env:PATH"
Write-Host "Running npm install to ensure 100% of node_modules are physically on disk..."
npm install --prefer-offline
Write-Host "npm install completed with exit code: $LASTEXITCODE"
