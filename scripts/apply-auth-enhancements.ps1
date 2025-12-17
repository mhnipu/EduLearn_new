# Apply Authentication Enhancements Script
# This script applies phone authentication support to EduLearn

Write-Host "🔐 EduLearn - Applying Authentication Enhancements" -ForegroundColor Cyan
Write-Host ""

# Check if we're in the correct directory
if (!(Test-Path ".\src\lib\auth.tsx")) {
    Write-Host "❌ Error: Run this script from the project root directory" -ForegroundColor Red
    Write-Host "   Current directory: $PWD" -ForegroundColor Yellow
    Write-Host "   Expected: e:\Work\Personal Projects\EduLearn\EduLearn_new" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Correct directory found" -ForegroundColor Green
Write-Host ""

# Step 1: Backup old files
Write-Host "📦 Step 1: Backing up old files..." -ForegroundColor Yellow

if (Test-Path ".\src\lib\auth.tsx") {
    Rename-Item -Path ".\src\lib\auth.tsx" -NewName "auth-old.tsx" -Force
    Write-Host "   ✅ Backed up: src/lib/auth.tsx → auth-old.tsx" -ForegroundColor Green
}

if (Test-Path ".\src\pages\Auth.tsx") {
    Rename-Item -Path ".\src\pages\Auth.tsx" -NewName "Auth-old.tsx" -Force
    Write-Host "   ✅ Backed up: src/pages/Auth.tsx → Auth-old.tsx" -ForegroundColor Green
}

Write-Host ""

# Step 2: Activate new files
Write-Host "🔄 Step 2: Activating enhanced files..." -ForegroundColor Yellow

if (Test-Path ".\src\lib\auth-enhanced.tsx") {
    Rename-Item -Path ".\src\lib\auth-enhanced.tsx" -NewName "auth.tsx" -Force
    Write-Host "   ✅ Activated: src/lib/auth-enhanced.tsx → auth.tsx" -ForegroundColor Green
} else {
    Write-Host "   ❌ Error: src/lib/auth-enhanced.tsx not found!" -ForegroundColor Red
    exit 1
}

if (Test-Path ".\src\pages\Auth-Enhanced.tsx") {
    Rename-Item -Path ".\src\pages\Auth-Enhanced.tsx" -NewName "Auth.tsx" -Force
    Write-Host "   ✅ Activated: src/pages/Auth-Enhanced.tsx → Auth.tsx" -ForegroundColor Green
} else {
    Write-Host "   ❌ Error: src/pages/Auth-Enhanced.tsx not found!" -ForegroundColor Red
    exit 1
}

Write-Host ""

# Step 3: Check .env file
Write-Host "🔍 Step 3: Checking .env configuration..." -ForegroundColor Yellow

if (Test-Path ".\.env") {
    $envContent = Get-Content ".\.env" -Raw
    if ($envContent -match "VITE_SUPABASE_URL" -and $envContent -match "VITE_SUPABASE_PUBLISHABLE_KEY") {
        Write-Host "   ✅ .env file found with Supabase configuration" -ForegroundColor Green
    } else {
        Write-Host "   ⚠️  .env file missing Supabase configuration!" -ForegroundColor Yellow
        Write-Host "   Please add:" -ForegroundColor Yellow
        Write-Host "   VITE_SUPABASE_URL=https://alazrdburoobipmofypc.supabase.co" -ForegroundColor Gray
        Write-Host "   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here" -ForegroundColor Gray
    }
} else {
    Write-Host "   ⚠️  .env file not found!" -ForegroundColor Yellow
    Write-Host "   Create .env file with:" -ForegroundColor Yellow
    Write-Host "   VITE_SUPABASE_URL=https://alazrdburoobipmofypc.supabase.co" -ForegroundColor Gray
    Write-Host "   VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here" -ForegroundColor Gray
}

Write-Host ""

# Step 4: Summary
Write-Host "✅ Authentication Enhancement Applied!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 Next Steps:" -ForegroundColor Cyan
Write-Host "   1. Apply database migration in Supabase Dashboard" -ForegroundColor White
Write-Host "      → See: EXTERNAL_SUPABASE_AUTH_GUIDE.md" -ForegroundColor Gray
Write-Host ""
Write-Host "   2. Restart development server:" -ForegroundColor White
Write-Host "      npm run dev" -ForegroundColor Gray
Write-Host ""
Write-Host "   3. Test authentication:" -ForegroundColor White
Write-Host "      - Open browser console (F12)" -ForegroundColor Gray
Write-Host "      - Look for: 'Using external Supabase database'" -ForegroundColor Gray
Write-Host "      - Try signup with phone number" -ForegroundColor Gray
Write-Host ""
Write-Host "📖 Full Guide: EXTERNAL_SUPABASE_AUTH_GUIDE.md" -ForegroundColor Cyan
Write-Host ""
Write-Host "🎉 Done!" -ForegroundColor Green
