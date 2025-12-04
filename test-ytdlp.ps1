# Test yt-dlp installation and execution
Write-Host "=== Testing yt-dlp Installation ===" -ForegroundColor Cyan

# Test 1: Check local installation
Write-Host "`n1. Checking local installation..." -ForegroundColor Yellow
$localPath = "$env:LOCALAPPDATA\yt-dlp\yt-dlp.exe"
if (Test-Path $localPath) {
    Write-Host "   ✓ Found at: $localPath" -ForegroundColor Green
    $ytdlp = $localPath
} else {
    Write-Host "   ✗ Not found at: $localPath" -ForegroundColor Red
}

# Test 2: Check PATH
Write-Host "`n2. Checking PATH..." -ForegroundColor Yellow
$pathCmd = Get-Command yt-dlp -ErrorAction SilentlyContinue
if ($pathCmd) {
    Write-Host "   ✓ Found in PATH: $($pathCmd.Source)" -ForegroundColor Green
    if (-not $ytdlp) { $ytdlp = $pathCmd.Source }
} else {
    Write-Host "   ✗ Not found in PATH" -ForegroundColor Red
}

# Test 3: Try to run yt-dlp
if ($ytdlp) {
    Write-Host "`n3. Testing execution..." -ForegroundColor Yellow
    try {
        $version = & $ytdlp --version 2>&1
        Write-Host "   ✓ yt-dlp version: $version" -ForegroundColor Green
    } catch {
        Write-Host "   ✗ Failed to execute: $_" -ForegroundColor Red
    }
    
    # Test 4: Try to get video info (without downloading)
    Write-Host "`n4. Testing YouTube connection..." -ForegroundColor Yellow
    $testUrl = "https://www.youtube.com/watch?v=dQw4w9WgXcQ"
    try {
        Write-Host "   Testing with: $testUrl"
        $info = & $ytdlp $testUrl --dump-json --no-download 2>&1 | Select-Object -First 1
        if ($info -match '"title"') {
            Write-Host "   ✓ Successfully connected to YouTube" -ForegroundColor Green
        } else {
            Write-Host "   ✗ Failed to get video info" -ForegroundColor Red
            Write-Host "   Output: $info" -ForegroundColor Gray
        }
    } catch {
        Write-Host "   ✗ Error: $_" -ForegroundColor Red
    }
} else {
    Write-Host "`n✗ yt-dlp not found!" -ForegroundColor Red
    Write-Host "`nTo install, run:" -ForegroundColor Yellow
    Write-Host "   winget install yt-dlp.yt-dlp" -ForegroundColor White
}

Write-Host "`n=== Test Complete ===" -ForegroundColor Cyan
