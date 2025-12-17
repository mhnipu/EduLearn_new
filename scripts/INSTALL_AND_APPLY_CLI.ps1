# ============================================
# Install Supabase CLI and Apply Migrations
# ============================================

Write-Host "🚀 Installing Supabase CLI..." -ForegroundColor Cyan

# Step 1: Download Supabase CLI for Windows
$supabaseVersion = "v1.200.3"
$downloadUrl = "https://github.com/supabase/cli/releases/download/$supabaseVersion/supabase_windows_amd64.zip"
$downloadPath = "$env:TEMP\supabase_cli.zip"
$extractPath = "$env:USERPROFILE\.supabase"

# Create directory if not exists
New-Item -ItemType Directory -Force -Path $extractPath | Out-Null

Write-Host "📥 Downloading Supabase CLI from GitHub..." -ForegroundColor Yellow
try {
    Invoke-WebRequest -Uri $downloadUrl -OutFile $downloadPath -UseBasicParsing
    Write-Host "✅ Download completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Download failed: $_" -ForegroundColor Red
    Write-Host "" -ForegroundColor Yellow
    Write-Host "⚠️  Manual Installation Required!" -ForegroundColor Yellow
    Write-Host "Please visit: https://github.com/supabase/cli/releases" -ForegroundColor Cyan
    Write-Host "Download: supabase_windows_amd64.zip" -ForegroundColor Cyan
    Write-Host "Extract to: $extractPath" -ForegroundColor Cyan
    exit 1
}

# Step 2: Extract
Write-Host "📦 Extracting..." -ForegroundColor Yellow
try {
    Expand-Archive -Path $downloadPath -DestinationPath $extractPath -Force
    Write-Host "✅ Extraction completed!" -ForegroundColor Green
} catch {
    Write-Host "❌ Extraction failed: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Add to PATH (for current session)
$env:Path = "$extractPath;$env:Path"

# Step 4: Verify installation
Write-Host "🔍 Verifying installation..." -ForegroundColor Yellow
$supabasePath = "$extractPath\supabase.exe"

if (Test-Path $supabasePath) {
    Write-Host "✅ Supabase CLI installed at: $supabasePath" -ForegroundColor Green
    
    # Show version
    & $supabasePath --version
    
    Write-Host "`n" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "📝 Now applying migrations..." -ForegroundColor Cyan
    Write-Host "============================================" -ForegroundColor Cyan
    Write-Host "`n" -ForegroundColor White
    
    # Navigate to project directory
    Set-Location "e:\Work\Personal Projects\EduLearn\EduLearn_new"
    
    # Step 5: Login to Supabase
    Write-Host "🔐 Please login to Supabase..." -ForegroundColor Yellow
    Write-Host "This will open your browser. Please authorize the CLI." -ForegroundColor White
    & $supabasePath login
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Login failed!" -ForegroundColor Red
        Write-Host "⚠️  Use Dashboard method instead:" -ForegroundColor Yellow
        Write-Host "https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host "✅ Login successful!" -ForegroundColor Green
    
    # Step 6: Link project
    Write-Host "`n🔗 Linking to project: alazrdburoobipmofypc" -ForegroundColor Yellow
    & $supabasePath link --project-ref alazrdburoobipmofypc
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Link failed!" -ForegroundColor Red
        Write-Host "⚠️  Use Dashboard method instead:" -ForegroundColor Yellow
        Write-Host "https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new" -ForegroundColor Cyan
        exit 1
    }
    
    Write-Host "✅ Project linked!" -ForegroundColor Green
    
    # Step 7: Apply specific critical migrations
    Write-Host "`n📋 Applying critical migrations..." -ForegroundColor Cyan
    Write-Host "`n" -ForegroundColor White
    
    # Migration 1: Security Fix
    Write-Host "1️⃣  Applying security fix..." -ForegroundColor Yellow
    & $supabasePath db push --file "supabase\migrations\20251212191752_fix_security_definer_view.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Security fix applied!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Security fix failed (might already be applied)" -ForegroundColor Yellow
    }
    
    # Migration 2: Phone Authentication
    Write-Host "`n2️⃣  Applying phone authentication support..." -ForegroundColor Yellow
    & $supabasePath db push --file "supabase\migrations\20251212194644_add_phone_authentication.sql"
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Phone authentication applied!" -ForegroundColor Green
    } else {
        Write-Host "⚠️  Phone authentication failed (might already be applied)" -ForegroundColor Yellow
    }
    
    Write-Host "`n" -ForegroundColor White
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "🎉 Migration process completed!" -ForegroundColor Green
    Write-Host "============================================" -ForegroundColor Green
    Write-Host "`n" -ForegroundColor White
    
    # Verification
    Write-Host "📊 Verifying in Supabase Dashboard:" -ForegroundColor Cyan
    Write-Host "https://supabase.com/dashboard/project/alazrdburoobipmofypc/auth/users" -ForegroundColor Cyan
    
    Write-Host "`n🚀 Next steps:" -ForegroundColor Yellow
    Write-Host "1. Restart your dev server: npm run dev" -ForegroundColor White
    Write-Host "2. Test signup with phone number" -ForegroundColor White
    Write-Host "3. Check browser console for success logs" -ForegroundColor White
    
} else {
    Write-Host "❌ Installation failed!" -ForegroundColor Red
    Write-Host "⚠️ Please use Dashboard method instead:" -ForegroundColor Yellow
    Write-Host "https://supabase.com/dashboard/project/alazrdburoobipmofypc/sql/new" -ForegroundColor Cyan
}

Write-Host "`n📖 Full guide: docs/migrations/APPLY_ALL_MIGRATIONS.md" -ForegroundColor Cyan
