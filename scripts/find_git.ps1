$gitDir = Test-Path "c:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint24\.git"
Write-Host ".git folder exists in project: $gitDir"

if ($gitDir) {
    if (Test-Path "c:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint24\.git\config") {
        Write-Host "--- .git/config content ---"
        Get-Content "c:\Users\gerec.brewer\OneDrive - Ball State University\checkpoint24\.git\config"
    }
}

$candidates = @(
  "C:\Program Files\Git\cmd\git.exe",
  "C:\Program Files\Git\bin\git.exe",
  "C:\Program Files (x86)\Git\cmd\git.exe",
  "C:\Users\gerec.brewer\AppData\Local\Programs\Git\cmd\git.exe",
  "C:\Users\gerec.brewer\AppData\Local\Programs\Git\bin\git.exe",
  "C:\Users\gerec.brewer\scoop\shims\git.exe",
  "C:\ProgramData\chocolatey\bin\git.exe"
)

# Also check GitHub Desktop installation
$ghDesktop = Get-ChildItem "C:\Users\gerec.brewer\AppData\Local\GitHubDesktop" -Recurse -Filter "git.exe" -ErrorAction SilentlyContinue | Select-Object -First 1
if ($ghDesktop) {
    Write-Host "Found git in GitHubDesktop: $($ghDesktop.FullName)"
}

foreach ($c in $candidates) {
    if (Test-Path $c) {
        Write-Host "FOUND GIT AT: $c"
    }
}

Write-Host "Checking where.exe git:"
where.exe git
