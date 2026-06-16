# Helper script to initialize Git and push to GitHub (run in PowerShell)
# Usage: right-click this file -> Run with PowerShell, or .\setup-git.ps1

$ProjectDir = Split-Path -Parent $MyInvocation.MyCommand.Path
Set-Location $ProjectDir

Write-Host "=== CTECH Blog - Git Setup ===" -ForegroundColor Cyan

# Check git
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    Write-Host "Git chưa cài. Đang cố cài qua winget..." -ForegroundColor Yellow
    winget install --id Git.Git -e --source winget
    Write-Host "Cài xong Git. Vui lòng đóng PowerShell này và mở lại để tiếp tục." -ForegroundColor Green
    Read-Host "Nhấn Enter để thoát"
    exit
}

# Check gh (GitHub CLI) - optional but recommended
$hasGh = $false
if (Get-Command gh -ErrorAction SilentlyContinue) {
    $hasGh = $true
    Write-Host "GitHub CLI đã có." -ForegroundColor Green
} else {
    Write-Host "GitHub CLI chưa có. Có thể cài sau bằng: winget install --id GitHub.cli" -ForegroundColor Yellow
}

# Init repo
if (-not (Test-Path .git)) {
    git init -b main
    Write-Host "Đã init git repo (main branch)." -ForegroundColor Green
} else {
    Write-Host "Đã có .git folder." -ForegroundColor Yellow
}

# Add and commit
git add .
git commit -m "chore: initial commit - CTECH personal blog (static Vercel + local server)" 2>$null

if ($LASTEXITCODE -eq 0) {
    Write-Host "Đã commit initial." -ForegroundColor Green
} else {
    Write-Host "Có thể đã commit trước đó hoặc không có thay đổi mới." -ForegroundColor Yellow
}

# Remote + push
if ($hasGh) {
    Write-Host "`nĐang tạo repo trên GitHub (nếu chưa có) và push..." -ForegroundColor Cyan
    gh repo create cuongvu0207/personal-blog --source . --public --push 2>&1
} else {
    Write-Host "`nHướng dẫn thủ công:" -ForegroundColor Cyan
    Write-Host "1. Vào https://github.com/new  (đăng nhập bằng tài khoản cuongvu0207)"
    Write-Host "2. Tạo repo tên: personal-blog (public)"
    Write-Host "3. Sau khi tạo, chạy các lệnh sau trong thư mục này:"
    Write-Host '   git remote add origin https://github.com/cuongvu0207/personal-blog.git'
    Write-Host '   git branch -M main'
    Write-Host '   git push -u origin main'
}

Write-Host "`nXong bước Git!" -ForegroundColor Green
Write-Host "Tiếp theo: vào Vercel project → Settings → Git Repository → Connect repo vừa tạo để bật auto deploy." -ForegroundColor Cyan

Read-Host "Nhấn Enter để đóng"
