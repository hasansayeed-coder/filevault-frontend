$base = "src"
$required = @(
    "src/app/layout.tsx",
    "src/app/page.tsx",
    "src/app/globals.css",
    "src/app/login/page.tsx",
    "src/app/register/page.tsx",
    "src/app/forgot-password/page.tsx",
    "src/app/reset-password/page.tsx",
    "src/app/dashboard/page.tsx",
    "src/app/dashboard/files/page.tsx",
    "src/app/subscription/page.tsx",
    "src/app/admin/dashboard/page.tsx",
    "src/app/admin/packages/page.tsx",
    "src/app/admin/users/page.tsx",
    "src/components/layout/AppLayout.tsx",
    "src/components/layout/Sidebar.tsx",
    "src/components/layout/AuthGuard.tsx",
    "src/components/ui/Modal.tsx",
    "src/components/ui/Button.tsx",
    "src/components/ui/ContextMenu.tsx",
    "src/components/folders/FolderCard.tsx",
    "src/components/folders/CreateFolderModal.tsx",
    "src/components/folders/RenameModal.tsx",
    "src/components/files/FileCard.tsx",
    "src/components/files/FileUploadZone.tsx",
    "src/components/files/FilePreviewModal.tsx",
    "src/components/admin/StatsCard.tsx",
    "src/components/admin/PackageForm.tsx",
    "src/store/authStore.ts",
    "src/lib/api.ts",
    "src/types/index.ts",
    "src/hooks/useAuth.ts",
    "src/hooks/useFolders.ts",
    ".env.local"
)

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "   FileVault Frontend File Checker" -ForegroundColor Cyan  
Write-Host "========================================`n" -ForegroundColor Cyan

$missing = @()
$found = @()

foreach ($file in $required) {
    if (Test-Path $file) {
        $found += $file
        Write-Host "  [OK] $file" -ForegroundColor Green
    } else {
        $missing += $file
        Write-Host "  [MISSING] $file" -ForegroundColor Red
    }
}

Write-Host "`n========================================" -ForegroundColor Cyan
Write-Host "  SUMMARY" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "  Found   : $($found.Count) files" -ForegroundColor Green
Write-Host "  Missing : $($missing.Count) files" -ForegroundColor Red

if ($missing.Count -gt 0) {
    Write-Host "`n  Missing files:" -ForegroundColor Yellow
    foreach ($f in $missing) {
        Write-Host "    - $f" -ForegroundColor Yellow
    }
}

Write-Host "========================================`n" -ForegroundColor Cyan