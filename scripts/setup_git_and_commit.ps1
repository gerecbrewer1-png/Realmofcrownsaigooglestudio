$gitExe = "C:\Program Files\Git\cmd\git.exe"
if (!(Test-Path $gitExe)) {
    $gitExe = "C:\Users\gerec.brewer\.tools\git\cmd\git.exe"
}

Write-Host "Using Git binary: $gitExe"

# 1. Initialize repository if .git doesn't exist
if (!(Test-Path ".git")) {
    Write-Host "Initializing git repository with main branch..."
    & $gitExe init -b main
}

# 2. Configure user info
& $gitExe config user.name "gerecbrewer1-png"
& $gitExe config user.email "gerecbrewer1@gmail.com"

# 3. Add remote if not present
$remotes = & $gitExe remote
if ($remotes -notcontains "origin") {
    Write-Host "Adding remote origin: https://github.com/gerecbrewer1-png/realmofcrownsNew.git"
    & $gitExe remote add origin "https://github.com/gerecbrewer1-png/realmofcrownsNew.git"
} else {
    & $gitExe remote set-url origin "https://github.com/gerecbrewer1-png/realmofcrownsNew.git"
}

# 4. Stage project changes
Write-Host "Staging appropriate project changes..."
& $gitExe add .

# 5. Commit
Write-Host "Creating commit..."
& $gitExe commit -m "feat(phase-2.8): Real-Time MMO Transport Foundation (WebSockets + AOI Replication + Multi-Client Voyage)"

# 6. Status and log
Write-Host "Git Status:"
& $gitExe status -s
Write-Host "Git Log:"
& $gitExe log -1 --stat
