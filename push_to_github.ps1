$ErrorActionPreference = "Continue"
$env:PATH = "C:\Program Files\Git\cmd;$env:PATH"
Set-Location -Path $PSScriptRoot

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Realm of Crowns - Push to GitHub" -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "Remote: https://github.com/gerecbrewer1-png/realmofcrownsNew.git" -ForegroundColor Yellow
Write-Host "Branch: main" -ForegroundColor Yellow
Write-Host ""

& "C:\Program Files\Git\cmd\git.exe" push -u origin main

Write-Host ""
Write-Host "Done!" -ForegroundColor Green
