$node = "C:\Program Files\nodejs\node.exe"
$tsx = "node_modules\tsx\dist\cli.mjs"

Write-Host "Starting server via direct node invocation..."
& $node $tsx server.ts
