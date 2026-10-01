<#
.SYNOPSIS
  Publishes the Fenrir website on GitHub Pages and the three downloads on a GitHub Release, with git and the gh CLI.

.DESCRIPTION
  Nothing happens until you run this file with -Owner and -Repo. It prints its plan and asks you to type YES
  before it changes anything (or pass -Yes). In order, it:
    1. checks that git and gh are installed, gh is signed in and git knows your name and email
    2. zips app\Fenrir.exe with app\_internal into Fenrir-portable.zip, in site\.release (ignored by git)
    3. writes releaseBase, releasesPage and each file's size and SHA-256 into versions.json, and the site's
       own address into the pages' og:image tags, so link previews work everywhere
    4. commits the site folder, creates the GitHub repository and pushes it (git push)
    5. turns on GitHub Pages for that branch
    6. creates the release v<version> with FenrirSetup.exe, FenrirConnect.exe and Fenrir-portable.zip,
       or replaces those three files when the release already exists
  Run it again after a new build: it refreshes versions.json, pushes, and uploads the new files.

.PARAMETER Owner
  Your GitHub user or organisation name.
.PARAMETER Repo
  The repository to create or update, for example fenrir.
.PARAMETER AppDir
  The folder with FenrirSetup.exe, FenrirConnect.exe, Fenrir.exe and _internal. Default: the app folder next to this site folder.
.PARAMETER Yes
  Go ahead without asking.
.PARAMETER Trailer
  A line added at the end of the site's commit message, for example a Co-Authored-By line.

.EXAMPLE
  powershell -ExecutionPolicy Bypass -File .\site\deploy.ps1 -Owner your-name -Repo fenrir
#>
[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)][ValidatePattern('^[A-Za-z0-9-]+$')][string] $Owner,
  [Parameter(Mandatory = $true)][ValidatePattern('^[A-Za-z0-9._-]+$')][string] $Repo,
  [string] $AppDir = '',
  [switch] $Yes,
  [string] $Trailer = ''
)

$ErrorActionPreference = 'Stop'

$Site = $PSScriptRoot
if (-not $AppDir) { $AppDir = Join-Path (Split-Path -Parent $Site) 'app' }
$Versions = Join-Path $Site 'versions.json'
$Work = Join-Path $Site '.release'
$Utf8 = New-Object System.Text.UTF8Encoding($false)
$Slug = "$Owner/$Repo"

function Say([string] $text) { Write-Host ''; Write-Host "==> $text" -ForegroundColor Cyan }
function Fail([string] $text) { Write-Host ''; Write-Host $text -ForegroundColor Red; exit 1 }

# git and gh write progress to stderr; Windows PowerShell 5.1 would treat that as an error under 'Stop'.
function Invoke-Tool([string] $exe, [string[]] $argv, [switch] $Quiet) {
  $saved = $ErrorActionPreference
  $ErrorActionPreference = 'Continue'
  try {
    if ($Quiet) { & $exe @argv *> $null } else { & $exe @argv | Out-Host }
    return $LASTEXITCODE
  } finally {
    $ErrorActionPreference = $saved
  }
}
function Run([string] $exe, [string[]] $argv) {
  $code = Invoke-Tool $exe $argv
  if ($code -ne 0) { Fail "'$exe $($argv -join ' ')' stopped with exit code $code. The steps after it did not run." }
}

# versions.json keeps its objects flat, so "<object>": { ... } never holds another brace
function Set-Field([string] $text, [string] $object, [string] $field, [string] $json) {
  $re = [regex]::new('("' + $object + '"\s*:\s*\{[^{}]*?"' + $field + '"\s*:\s*)("(?:[^"\\]|\\.)*"|-?\d+(?:\.\d+)?|null)')
  if (-not $re.IsMatch($text)) { Fail "versions.json has no $object.$field to fill in." }
  return $re.Replace($text, '${1}' + $json.Replace('$', '$$'), 1)
}
function Set-Top([string] $text, [string] $field, [string] $json) {
  $re = [regex]::new('("' + $field + '"\s*:\s*)"(?:[^"\\]|\\.)*"')
  if (-not $re.IsMatch($text)) { Fail "versions.json has no $field to fill in." }
  return $re.Replace($text, '${1}' + $json.Replace('$', '$$'), 1)
}

# ---------- checks ----------
foreach ($tool in @('git', 'gh')) {
  if (-not (Get-Command $tool -ErrorAction SilentlyContinue)) {
    Fail "$tool is not installed. Get git from https://git-scm.com and gh from https://cli.github.com, then run this again."
  }
}
if ((Invoke-Tool 'gh' @('auth', 'status') -Quiet) -ne 0) { Fail 'gh is not signed in. Run: gh auth login' }
$gitName = & git config user.name
$gitMail = & git config user.email
if (-not $gitName -or -not $gitMail) {
  Fail 'git does not know who you are yet. Run: git config --global user.name "Your Name"  and  git config --global user.email you@example.com'
}

$setup = Join-Path $AppDir 'FenrirSetup.exe'
$connect = Join-Path $AppDir 'FenrirConnect.exe'
$hostExe = Join-Path $AppDir 'Fenrir.exe'
$linkApk = Join-Path $AppDir 'FenrirLink.apk'  # the phone app, when its build is in the app folder (from the fenrir-link repository)
$linkIpa = Join-Path $AppDir 'FenrirLink.ipa'
$internal = Join-Path $AppDir '_internal'
foreach ($f in @($setup, $connect, $hostExe, $internal)) {
  if (-not (Test-Path -LiteralPath $f)) { Fail "Missing $f. Build the apps first (python fenrir\build\build.py) or pass -AppDir." }
}
if (-not (Test-Path -LiteralPath $Versions)) { Fail 'versions.json is missing next to this script.' }

$v = [System.IO.File]::ReadAllText($Versions) | ConvertFrom-Json
$version = [string] $v.fenrir.version
$connectVersion = [string] $v.connect.version
if (-not $version) { Fail 'versions.json has no fenrir.version.' }
$tag = "v$version"

if ($Repo -ieq "$Owner.github.io") { $pagesUrl = "https://$Owner.github.io/" } else { $pagesUrl = "https://$Owner.github.io/$Repo/" }
$releaseBase = "https://github.com/$Slug/releases/latest/download/"
$releasesPage = "https://github.com/$Slug/releases"
$zip = Join-Path $Work 'Fenrir-portable.zip'

# ---------- the plan ----------
Write-Host ''
Write-Host "Fenrir $version and Fenrir Connect $connectVersion" -ForegroundColor White
Write-Host "  Site folder:  $Site"
Write-Host "  App folder:   $AppDir"
Write-Host "  Repository:   https://github.com/$Slug (public)"
Write-Host "  Website:      $pagesUrl"
Write-Host "  Release:      $tag with FenrirSetup.exe, FenrirConnect.exe and Fenrir-portable.zip"
if ((Test-Path -LiteralPath $linkApk) -or (Test-Path -LiteralPath $linkIpa)) { Write-Host '                and Fenrir Link for phones (FenrirLink.apk, FenrirLink.ipa)' }
Write-Host ''
Write-Host 'It zips the portable Fenrir, fills in versions.json and the link-preview address in the pages,'
Write-Host 'commits and pushes the site folder, turns on GitHub Pages and uploads the release files.'
if (-not $Yes) {
  $answer = Read-Host 'Type YES to go ahead'
  if ($answer -cne 'YES') { Write-Host 'Nothing was changed.'; exit 0 }
}

# ---------- 1. the portable zip ----------
Say 'Zipping the portable Fenrir'
New-Item -ItemType Directory -Force -Path $Work | Out-Null
if (Test-Path -LiteralPath $zip) { Remove-Item -LiteralPath $zip -Force }
# a running Fenrir keeps files in _internal open, and Compress-Archive refuses to read those: copy first, then zip the copy
$portable = Join-Path $Work 'portable'
if (Test-Path -LiteralPath $portable) { Remove-Item -LiteralPath $portable -Recurse -Force }
New-Item -ItemType Directory -Force -Path $portable | Out-Null
Copy-Item -LiteralPath $hostExe -Destination $portable
Copy-Item -LiteralPath $internal -Destination (Join-Path $portable '_internal') -Recurse
Add-Type -AssemblyName System.IO.Compression.FileSystem
[System.IO.Compression.ZipFile]::CreateFromDirectory($portable, $zip, [System.IO.Compression.CompressionLevel]::Optimal, $false)
Remove-Item -LiteralPath $portable -Recurse -Force

# ---------- 2. versions.json and the link previews ----------
Say 'Writing sizes, checksums and addresses into versions.json'
$text = [System.IO.File]::ReadAllText($Versions)
$text = Set-Top $text 'releaseBase' ('"' + $releaseBase + '"')
$text = Set-Top $text 'releasesPage' ('"' + $releasesPage + '"')
$files = @(
  @{ Key = 'fenrir'; Path = $setup },
  @{ Key = 'connect'; Path = $connect },
  @{ Key = 'portable'; Path = $zip }
)
if (Test-Path -LiteralPath $linkApk) { $files += @{ Key = 'linkAndroid'; Path = $linkApk } }
if (Test-Path -LiteralPath $linkIpa) { $files += @{ Key = 'linkIphone'; Path = $linkIpa } }
foreach ($f in $files) {
  $size = (Get-Item -LiteralPath $f.Path).Length
  $sha = (Get-FileHash -LiteralPath $f.Path -Algorithm SHA256).Hash.ToLowerInvariant()
  $text = Set-Field $text $f.Key 'size' ([string] $size)
  $text = Set-Field $text $f.Key 'sha256' ('"' + $sha + '"')
  Write-Host ('  {0,-22} {1,14:N0} bytes  {2}' -f (Split-Path -Leaf $f.Path), $size, $sha)
}
try { $null = $text | ConvertFrom-Json } catch { Fail 'versions.json would stop being valid JSON, so it was left as it was.' }
[System.IO.File]::WriteAllText($Versions, $text, $Utf8)

Say 'Pointing the link previews at the site address'
Get-ChildItem -LiteralPath $Site -Filter '*.html' | ForEach-Object {
  $html = [System.IO.File]::ReadAllText($_.FullName)
  $new = [regex]::Replace($html, '(<meta property="og:image" content=")(?:https?://[^"]*?/)?(assets/[^"]+")', ('${1}' + $pagesUrl + '${2}'))
  if ($new -ne $html) { [System.IO.File]::WriteAllText($_.FullName, $new, $Utf8) }
}

# ---------- 3. the repository, Pages and the release ----------
Push-Location -LiteralPath $Site
try {
  Say 'Committing the site'
  if (-not (Test-Path -LiteralPath (Join-Path $Site '.git'))) { Run 'git' @('init', '-b', 'main') }
  Run 'git' @('add', '-A')
  $pending = & git status --porcelain
  $message = "Fenrir site for build $version"
  if ($Trailer) { $message += "`n`n$Trailer" }
  if ($pending) { Run 'git' @('commit', '-m', $message) } else { Write-Host '  Nothing new to commit.' }
  $branch = (& git rev-parse --abbrev-ref HEAD | Out-String).Trim()

  $remotes = @(& git remote)
  if ($remotes -notcontains 'origin') {
    Say "Creating github.com/$Slug"
    Run 'gh' @('repo', 'create', $Slug, '--public', '--source', '.', '--remote', 'origin', '--description', 'Fenrir: host a modded Minecraft world for your friends from one Windows PC')
  }

  Say 'Pushing the site (git push)'
  Run 'git' @('push', '-u', 'origin', $branch)

  Say 'Turning on GitHub Pages'
  $code = Invoke-Tool 'gh' @('api', '-X', 'POST', "repos/$Slug/pages", '-f', "source[branch]=$branch", '-f', 'source[path]=/') -Quiet
  if ($code -ne 0) { Write-Host '  Pages was already on, or GitHub needs a moment. If the site does not appear, check Settings -> Pages.' -ForegroundColor Yellow }

  Say "Publishing the release $tag"
  $notesFile = Join-Path $Work 'notes.md'
  $lines = @("Fenrir $version and Fenrir Connect $connectVersion.", '')
  foreach ($n in @($v.notes)) { $lines += "- $n" }
  [System.IO.File]::WriteAllText($notesFile, ($lines -join "`n"), $Utf8)
  $assets = @($setup, $connect, $zip)
  foreach ($phone in @($linkApk, $linkIpa)) { if (Test-Path -LiteralPath $phone) { $assets += $phone } }
  if ((Invoke-Tool 'gh' @('release', 'view', $tag, '--repo', $Slug) -Quiet) -eq 0) {
    Run 'gh' (@('release', 'upload', $tag) + $assets + @('--repo', $Slug, '--clobber'))
  } else {
    Run 'gh' (@('release', 'create', $tag) + $assets + @('--repo', $Slug, '--title', "Fenrir $version", '--notes-file', $notesFile))
  }
} finally {
  Pop-Location
}

Remove-Item -LiteralPath $Work -Recurse -Force -ErrorAction SilentlyContinue

Say 'Done'
Write-Host "  Website:    $pagesUrl   (the first build of the site can take a minute or two)"
Write-Host "  Downloads:  $releaseBase<file name>"
Write-Host "  Release:    https://github.com/$Slug/releases/tag/$tag"
