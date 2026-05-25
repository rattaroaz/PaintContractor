# Downloads Microsoft Edge WebDriver matching the installed Edge version and adds it to PATH for this session.
# Requires: cargo install --git https://github.com/chippers/msedgedriver-tool
$ErrorActionPreference = "Stop"
$tool = Join-Path $env:USERPROFILE ".cargo\bin\msedgedriver-tool.exe"
if (-not (Test-Path $tool)) {
  Write-Host "Installing msedgedriver-tool..."
  cargo install --git https://github.com/chippers/msedgedriver-tool
}
Push-Location $PSScriptRoot
& $tool
Pop-Location

$driversDir = Join-Path $PSScriptRoot "..\drivers"
New-Item -ItemType Directory -Force -Path $driversDir | Out-Null
$src = Join-Path $PSScriptRoot "msedgedriver.exe"
if (-not (Test-Path $src)) {
  $src = Join-Path (Get-Location) "msedgedriver.exe"
}
if (-not (Test-Path $src)) {
  throw "msedgedriver.exe not found after msedgedriver-tool run"
}
Copy-Item $src (Join-Path $driversDir "msedgedriver.exe") -Force
Write-Host "Installed: $(Join-Path $driversDir 'msedgedriver.exe')"

$driverDir = Join-Path $env:USERPROFILE ".cargo\bin"
if ($env:PATH -notlike "*$driverDir*") {
  $env:PATH = "$driverDir;$env:PATH"
}
