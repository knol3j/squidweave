$ErrorActionPreference = "Stop"

$sourceRoot = if ($PSScriptRoot) { Split-Path -Parent $PSScriptRoot } else { Get-Location }
$packageRoot = Resolve-Path $sourceRoot
$targetRoot = Get-Location

Write-Host "[deps] package root: $packageRoot"
Write-Host "[deps] install target: $targetRoot"

$items = @(
  @{ Source = Join-Path $packageRoot "node_modules"; Destination = Join-Path $targetRoot "node_modules" },
  @{ Source = Join-Path $packageRoot "package.json"; Destination = Join-Path $targetRoot "package.json" },
  @{ Source = Join-Path $packageRoot "package-lock.json"; Destination = Join-Path $targetRoot "package-lock.json" },
  @{ Source = Join-Path $packageRoot "ui\node_modules"; Destination = Join-Path $targetRoot "ui\node_modules" },
  @{ Source = Join-Path $packageRoot "ui\package.json"; Destination = Join-Path $targetRoot "ui\package.json" },
  @{ Source = Join-Path $packageRoot "ui\package-lock.json"; Destination = Join-Path $targetRoot "ui\package-lock.json" }
)

foreach ($item in $items) {
  if (-not (Test-Path $item.Source)) {
    throw "Missing required package item: $($item.Source)"
  }

  $parent = Split-Path -Parent $item.Destination
  if ($parent -and -not (Test-Path $parent)) {
    New-Item -ItemType Directory -Path $parent -Force | Out-Null
  }

  if (Test-Path $item.Source -PathType Container) {
    Copy-Item -Path $item.Source -Destination $item.Destination -Recurse -Force
  } else {
    Copy-Item -Path $item.Source -Destination $item.Destination -Force
  }
}

Write-Host "[deps] offline dependency package installed successfully"
