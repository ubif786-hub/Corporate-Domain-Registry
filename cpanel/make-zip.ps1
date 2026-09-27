# Zips the CONTENTS of out/ for upload to cPanel's File Manager.
#
#   powershell -File cpanel/make-zip.ps1 -Dest "C:\Users\ali\OneDrive\Desktop\corporate-domain-registry-site.zip"
#
# WHY NOT Compress-Archive: on Windows PowerShell 5.1 it writes entry names with BACKSLASHES
# (api\geo.php). A Linux unzip, which is what cPanel runs, does not read that as a folder: it
# creates a flat file literally named "api\geo.php" and the site arrives as three hundred oddly
# named files with no folders. Found 21 Sep 2026 by listing the first zip before it was uploaded.
# This writes every entry with forward slashes and refuses to finish if one slipped through.
param([Parameter(Mandatory = $true)][string]$Dest)

Add-Type -AssemblyName System.IO.Compression
Add-Type -AssemblyName System.IO.Compression.FileSystem

$root = Join-Path (Split-Path -Parent $PSScriptRoot) "out"
if (-not (Test-Path (Join-Path $root "index.html"))) { throw "no export at $root; run scripts/export-cpanel.mjs first" }
if (Test-Path -LiteralPath $Dest) { [System.IO.File]::Delete($Dest) }

$stream = [System.IO.File]::Open($Dest, [System.IO.FileMode]::CreateNew)
$archive = New-Object System.IO.Compression.ZipArchive($stream, [System.IO.Compression.ZipArchiveMode]::Create)
try {
  foreach ($file in Get-ChildItem -LiteralPath $root -Recurse -File -Force) {
    $name = $file.FullName.Substring($root.Length + 1).Replace([char]92, [char]47)
    $entry = $archive.CreateEntry($name, [System.IO.Compression.CompressionLevel]::Optimal)
    $out = $entry.Open()
    $in = [System.IO.File]::OpenRead($file.FullName)
    try { $in.CopyTo($out) } finally { $in.Dispose(); $out.Dispose() }
  }
} finally {
  $archive.Dispose()
  $stream.Dispose()
}

$check = [System.IO.Compression.ZipFile]::OpenRead($Dest)
try {
  $bad = @($check.Entries | Where-Object { $_.FullName.IndexOf([char]92) -ge 0 })
  $need = @(".htaccess", "index.html", "api/geo.php", "api/geo/dbip-city-lite.mmdb", "search/index.html")
  $have = $check.Entries | ForEach-Object { $_.FullName }
  $missing = @($need | Where-Object { $have -notcontains $_ })
  "entries: {0}   with a backslash: {1}   missing: {2}" -f $check.Entries.Count, $bad.Count, ($missing -join ", ")
  if ($bad.Count -gt 0 -or $missing.Count -gt 0) { throw "the zip is not fit to upload" }
} finally { $check.Dispose() }
"{0}  {1:N1} MB" -f (Split-Path -Leaf $Dest), ((Get-Item -LiteralPath $Dest).Length / 1MB)
