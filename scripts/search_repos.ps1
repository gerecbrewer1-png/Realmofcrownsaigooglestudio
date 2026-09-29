$places = @(
  "C:\Users\gerec.brewer\source",
  "C:\Users\gerec.brewer\repos",
  "C:\Users\gerec.brewer\Documents",
  "C:\Users\gerec.brewer\Desktop",
  "C:\source",
  "C:\git"
)
foreach ($p in $places) {
  if (Test-Path $p) {
    Write-Host "Checking $p..."
    Get-ChildItem -Path $p -Filter ".git" -Hidden -Recurse -Depth 3 -ErrorAction SilentlyContinue | Select-Object FullName
  }
}

# Also search for any git.exe on whole C: drive quick check
Write-Host "Looking for git.exe in AppData..."
Get-ChildItem -Path "C:\Users\gerec.brewer\AppData" -Filter "git.exe" -Recurse -Depth 4 -ErrorAction SilentlyContinue | Select-Object FullName
