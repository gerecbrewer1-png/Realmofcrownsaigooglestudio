Start-Sleep -Seconds 2
try {
    $res = Invoke-WebRequest -Uri "http://127.0.0.1:3000/api/health" -UseBasicParsing -TimeoutSec 5
    Write-Host "HTTP STATUS:" $res.StatusCode
    Write-Host "CONTENT:" $res.Content
} catch {
    Write-Host "HEALTH CHECK ERROR:" $_
}
