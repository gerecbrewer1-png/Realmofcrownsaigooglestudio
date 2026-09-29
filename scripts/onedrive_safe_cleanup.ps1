$ErrorActionPreference = "Continue"

$oneDrive = (Get-Item $PSScriptRoot).Parent.Parent.FullName
Write-Host "OneDrive Path: $oneDrive" -ForegroundColor Cyan

# Explicit whitelist of folders and files that MUST NEVER BE TOUCHED:
$protectedPatterns = @(
    "Attachments",
    "CS120Portfolio",
    "Microsoft Copilot Chat Files",
    "checkpoint24",
    "checkpoint28.zip",
    "git repository new.txt",
    "RealmCodeIdeas.txt",
    "CWM02*",
    "Lab02*",
    "Yes - if you mean Ball State*",
    "ai.txt"
)

# Explicit target list of OLD game items to remove to free up storage:
$itemsToRemove = @(
    "realm-of-crowns_-medieval-mmo-strategy",
    "RealmOfCrowns_MountainInspection_23",
    "The last check point.zip",
    "checkpoint24.zip",
    "checkpoint25.zip",
    "checkpoint26.zip",
    "checkpoint27.zip",
    "checkpoint28_pre_transport.zip",
    "RealmOfCrowns_MountainInspection_22.txt",
    "RealmOfCrowns_Mountain_Inspection_Context.txt",
    "RealmOfCrowns_Mountain_Source_23.txt",
    "RealmOfCrowns_Voyage_Mountain_Renderer_24.txt"
)

Write-Host "Removing old game items to reclaim storage..." -ForegroundColor Yellow

foreach ($item in $itemsToRemove) {
    $fullPath = Join-Path $oneDrive $item
    if (Test-Path $fullPath) {
        $isProtected = $false
        foreach ($pattern in $protectedPatterns) {
            if ($item -like $pattern) {
                $isProtected = $true
                break
            }
        }

        if ($isProtected) {
            Write-Host "SKIPPING PROTECTED ITEM: $item" -ForegroundColor Red
            continue
        }

        if (Test-Path $fullPath -PathType Container) {
            Write-Host "Removing Directory: $item" -ForegroundColor DarkYellow
            # Using cmd /c rd /s /q for fast, non-blocking recursive directory removal on Windows
            cmd.exe /c "rd /s /q `"$fullPath`""
            if (Test-Path $fullPath) {
                # Fallback if any handles remained
                Remove-Item -Path $fullPath -Recurse -Force -ErrorAction SilentlyContinue
            }
            Write-Host " -> Directory removed: $item" -ForegroundColor Green
        } else {
            Write-Host "Removing File: $item" -ForegroundColor DarkYellow
            Remove-Item -Path $fullPath -Force -ErrorAction SilentlyContinue
            Write-Host " -> File removed: $item" -ForegroundColor Green
        }
    } else {
        Write-Host "Item not found (already cleaned): $item" -ForegroundColor Gray
    }
}

Write-Host "`nCleanup Complete! Remaining OneDrive contents:" -ForegroundColor Cyan
Get-ChildItem -Path $oneDrive | Select-Object Name, PSIsContainer, Length, LastWriteTime | Format-Table -AutoSize
