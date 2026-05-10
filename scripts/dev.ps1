$ErrorActionPreference = "Stop"

$root = Split-Path -Parent $PSScriptRoot
$uiDir = Join-Path $root "ui"

if (-not (Test-Path (Join-Path $uiDir "node_modules"))) {
  throw "ui/node_modules is missing. Run 'npm --prefix ui install' first."
}

$apiPort = if ($env:PORT) { $env:PORT } else { "4010" }
$apiUrl = "http://127.0.0.1:$apiPort"
$uiUrl = if ($env:VITE_DEV_URL) { $env:VITE_DEV_URL } else { "http://127.0.0.1:3000" }

Write-Host "[dev] starting LocaleWeave backend at $apiUrl"
Write-Host "[dev] starting LocaleWeave UI at $uiUrl"
Write-Host "[dev] press Ctrl+C to stop both processes"

$apiProcess = Start-Process -FilePath "node" -ArgumentList "src/server.mjs" -WorkingDirectory $root -PassThru -NoNewWindow
$uiProcess = Start-Process -FilePath "npm.cmd" -ArgumentList "run","dev" -WorkingDirectory $uiDir -PassThru -NoNewWindow

try {
  while (-not $apiProcess.HasExited -and -not $uiProcess.HasExited) {
    Start-Sleep -Seconds 1
  }

  if ($apiProcess.HasExited -and $apiProcess.ExitCode -ne 0) {
    throw "Backend exited with code $($apiProcess.ExitCode)."
  }

  if ($uiProcess.HasExited -and $uiProcess.ExitCode -ne 0) {
    throw "UI exited with code $($uiProcess.ExitCode)."
  }
} finally {
  foreach ($process in @($apiProcess, $uiProcess)) {
    if ($process -and -not $process.HasExited) {
      Stop-Process -Id $process.Id -Force
    }
  }
}
