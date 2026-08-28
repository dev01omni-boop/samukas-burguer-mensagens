$pwdPath = (Get-Location).Path
$distDir = Join-Path $pwdPath "dist"
$zipPath = Join-Path $pwdPath "dist.zip"

if (Test-Path $distDir) {
    Remove-Item -Recurse -Force $distDir
}
if (Test-Path $zipPath) {
    Remove-Item -Force $zipPath
}

New-Item -ItemType Directory -Path $distDir | Out-Null

$filesToCopy = @("index.html", "style.css", "app.js", "config.js", "Logo.PNG")

foreach ($file in $filesToCopy) {
    $src = Join-Path $pwdPath $file
    if (Test-Path $src) {
        Copy-Item -LiteralPath $src -Destination $distDir -Force
        Write-Host "Copied $file to dist"
    } else {
        Write-Warning "File not found: $file"
    }
}

Compress-Archive -Path "$distDir\*" -DestinationPath $zipPath -Force
Write-Host "Successfully generated dist folder and dist.zip at $zipPath"
