[CmdletBinding()]
param(
  [Parameter(Mandatory = $true)]
  [string]$SourceImage,

  [string]$FreedoomWad = "third_party/dwasm/wasm/fs/freedoom1.wad",
  [string]$OutWad = "games/nightfall/assets/nightfall-face.wad",
  [string]$OutSource = "games/nightfall/assets/nightfall-face-source.png",
  [string]$OutPreview = "games/nightfall/assets/nightfall-face-preview.png"
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

Add-Type -AssemblyName System.Drawing

$RepoRoot = Resolve-Path (Join-Path $PSScriptRoot "../..")
$SourceImagePath = Resolve-Path $SourceImage
$FreedoomWadPath = Resolve-Path (Join-Path $RepoRoot $FreedoomWad)
$OutWadPath = Join-Path $RepoRoot $OutWad
$OutSourcePath = Join-Path $RepoRoot $OutSource
$OutPreviewPath = Join-Path $RepoRoot $OutPreview
$AssetDir = Split-Path -Parent $OutWadPath
New-Item -ItemType Directory -Force -Path $AssetDir | Out-Null

$Ascii = [System.Text.Encoding]::ASCII

function Read-Int32LE {
  param([byte[]]$Bytes, [int]$Offset)
  return [System.BitConverter]::ToInt32($Bytes, $Offset)
}

function Get-FreedoomPalette {
  param([string]$WadPath)

  $bytes = [System.IO.File]::ReadAllBytes($WadPath)
  $lumpCount = Read-Int32LE $bytes 4
  $directoryOffset = Read-Int32LE $bytes 8

  for ($i = 0; $i -lt $lumpCount; $i++) {
    $entryOffset = $directoryOffset + ($i * 16)
    $fileOffset = Read-Int32LE $bytes $entryOffset
    $size = Read-Int32LE $bytes ($entryOffset + 4)
    $nameBytes = New-Object byte[] 8
    [System.Array]::Copy($bytes, $entryOffset + 8, $nameBytes, 0, 8)
    $name = $Ascii.GetString($nameBytes).Trim([char]0)

    if ($name -eq "PLAYPAL") {
      if ($size -lt 768) {
        throw "PLAYPAL lump is too small to contain a full palette."
      }

      $palette = New-Object "System.Drawing.Color[]" 256
      for ($index = 0; $index -lt 256; $index++) {
        $base = $fileOffset + ($index * 3)
        $palette[$index] = [System.Drawing.Color]::FromArgb($bytes[$base], $bytes[$base + 1], $bytes[$base + 2])
      }
      return $palette
    }
  }

  throw "PLAYPAL lump not found in $WadPath."
}

function Clamp-Byte {
  param([double]$Value)
  return [byte][Math]::Max(0, [Math]::Min(255, [Math]::Round($Value)))
}

function Adjust-Color {
  param([System.Drawing.Color]$Color)

  $saturation = 1.18
  $contrast = 1.12
  $brightness = 4.0
  $gray = (0.299 * $Color.R) + (0.587 * $Color.G) + (0.114 * $Color.B)

  $r = ($gray + (($Color.R - $gray) * $saturation) - 127.5) * $contrast + 127.5 + $brightness
  $g = ($gray + (($Color.G - $gray) * $saturation) - 127.5) * $contrast + 127.5 + $brightness
  $b = ($gray + (($Color.B - $gray) * $saturation) - 127.5) * $contrast + 127.5 + $brightness

  return [System.Drawing.Color]::FromArgb((Clamp-Byte $r), (Clamp-Byte $g), (Clamp-Byte $b))
}

function Find-NearestPaletteIndex {
  param([System.Drawing.Color]$Color, [System.Drawing.Color[]]$Palette)

  $bestIndex = 0
  $bestDistance = [double]::PositiveInfinity

  for ($index = 0; $index -lt $Palette.Length; $index++) {
    $candidate = $Palette[$index]
    $dr = [int]$Color.R - [int]$candidate.R
    $dg = [int]$Color.G - [int]$candidate.G
    $db = [int]$Color.B - [int]$candidate.B
    $distance = ($dr * $dr * 0.30) + ($dg * $dg * 0.59) + ($db * $db * 0.11)

    if ($distance -lt $bestDistance) {
      $bestDistance = $distance
      $bestIndex = $index
    }
  }

  return [byte]$bestIndex
}

function New-FacePatchIndices {
  param([string]$ImagePath, [System.Drawing.Color[]]$Palette)

  $targetWidth = 24
  $targetHeight = 32
  $targetAspect = $targetWidth / $targetHeight
  $source = [System.Drawing.Bitmap]::new($ImagePath)

  try {
    $sourceAspect = $source.Width / $source.Height
    if ($sourceAspect -gt $targetAspect) {
      $cropHeight = $source.Height
      $cropWidth = [int][Math]::Round($cropHeight * $targetAspect)
      $cropX = [int][Math]::Round(($source.Width - $cropWidth) / 2)
      $cropY = 0
    } else {
      $cropWidth = $source.Width
      $cropHeight = [int][Math]::Round($cropWidth / $targetAspect)
      $cropX = 0
      # Bias slightly upward to preserve hair while keeping the beard in frame.
      $cropY = [int][Math]::Round(($source.Height - $cropHeight) * 0.40)
    }

    $crop = [System.Drawing.Rectangle]::new($cropX, $cropY, $cropWidth, $cropHeight)
    $small = [System.Drawing.Bitmap]::new($targetWidth, $targetHeight)
    $graphics = [System.Drawing.Graphics]::FromImage($small)

    try {
      $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighQuality
      $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::HighQualityBicubic
      $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::HighQuality
      $graphics.DrawImage($source, [System.Drawing.Rectangle]::new(0, 0, $targetWidth, $targetHeight), $crop, [System.Drawing.GraphicsUnit]::Pixel)
    } finally {
      $graphics.Dispose()
    }

    $indices = New-Object byte[] ($targetWidth * $targetHeight)
    $previewScale = 8
    $preview = [System.Drawing.Bitmap]::new($targetWidth * $previewScale, $targetHeight * $previewScale)
    $previewGraphics = [System.Drawing.Graphics]::FromImage($preview)

    try {
      $previewGraphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
      $previewGraphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half

      for ($y = 0; $y -lt $targetHeight; $y++) {
        for ($x = 0; $x -lt $targetWidth; $x++) {
          $adjusted = Adjust-Color ($small.GetPixel($x, $y))
          $paletteIndex = Find-NearestPaletteIndex $adjusted $Palette
          $indices[($y * $targetWidth) + $x] = $paletteIndex
          $small.SetPixel($x, $y, $Palette[$paletteIndex])
        }
      }

      $small.Save($OutSourcePath, [System.Drawing.Imaging.ImageFormat]::Png)
      $previewGraphics.Clear([System.Drawing.Color]::Black)
      $previewGraphics.DrawImage($small, [System.Drawing.Rectangle]::new(0, 0, $preview.Width, $preview.Height), [System.Drawing.Rectangle]::new(0, 0, $small.Width, $small.Height), [System.Drawing.GraphicsUnit]::Pixel)
      $preview.Save($OutPreviewPath, [System.Drawing.Imaging.ImageFormat]::Png)
    } finally {
      $previewGraphics.Dispose()
      $preview.Dispose()
      $small.Dispose()
    }

    return $indices
  } finally {
    $source.Dispose()
  }
}

function New-DoomPatch {
  param([byte[]]$Indices, [int]$Width, [int]$Height)

  $stream = [System.IO.MemoryStream]::new()
  $writer = [System.IO.BinaryWriter]::new($stream)

  try {
    $writer.Write([int16]$Width)
    $writer.Write([int16]$Height)
    $writer.Write([int16]0)
    $writer.Write([int16]0)

    for ($x = 0; $x -lt $Width; $x++) {
      $writer.Write([int32]0)
    }

    $columnOffsets = New-Object int[] $Width
    for ($x = 0; $x -lt $Width; $x++) {
      $columnOffsets[$x] = [int]$stream.Position
      $writer.Write([byte]0)
      $writer.Write([byte]$Height)
      $writer.Write([byte]0)

      for ($y = 0; $y -lt $Height; $y++) {
        $writer.Write([byte]$Indices[($y * $Width) + $x])
      }

      $writer.Write([byte]0)
      $writer.Write([byte]255)
    }

    $patch = $stream.ToArray()
    for ($x = 0; $x -lt $Width; $x++) {
      [System.BitConverter]::GetBytes([int32]$columnOffsets[$x]).CopyTo($patch, 8 + ($x * 4))
    }

    return $patch
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

function Get-StatusFaceLumpNames {
  $names = New-Object "System.Collections.Generic.List[string]"

  for ($pain = 0; $pain -le 4; $pain++) {
    for ($variant = 0; $variant -le 2; $variant++) {
      $names.Add("STFST$pain$variant")
      $names.Add("STFTR$pain$variant")
      $names.Add("STFTL$pain$variant")
    }
    $names.Add("STFOUCH$pain")
    $names.Add("STFEVL$pain")
    $names.Add("STFKILL$pain")
  }

  $names.Add("STFGOD0")
  $names.Add("STFDEAD0")
  return $names
}

function Write-Pwad {
  param([string]$Path, [byte[]]$PatchBytes, [string[]]$LumpNames)

  $stream = [System.IO.MemoryStream]::new()
  $writer = [System.IO.BinaryWriter]::new($stream)
  $entries = New-Object "System.Collections.Generic.List[object]"

  try {
    $writer.Write($Ascii.GetBytes("PWAD"))
    $writer.Write([int32]0)
    $writer.Write([int32]0)

    foreach ($name in $LumpNames) {
      if ($name.Length -gt 8) {
        throw "WAD lump name is longer than 8 characters: $name"
      }

      $offset = [int]$stream.Position
      $writer.Write($PatchBytes)
      $entries.Add([pscustomobject]@{
        Name = $name
        Offset = $offset
        Size = $PatchBytes.Length
      })
    }

    $directoryOffset = [int]$stream.Position
    foreach ($entry in $entries) {
      $writer.Write([int32]$entry.Offset)
      $writer.Write([int32]$entry.Size)
      $nameBytes = New-Object byte[] 8
      $encodedName = $Ascii.GetBytes($entry.Name)
      [System.Array]::Copy($encodedName, 0, $nameBytes, 0, $encodedName.Length)
      $writer.Write($nameBytes)
    }

    $wad = $stream.ToArray()
    [System.BitConverter]::GetBytes([int32]$entries.Count).CopyTo($wad, 4)
    [System.BitConverter]::GetBytes([int32]$directoryOffset).CopyTo($wad, 8)
    [System.IO.File]::WriteAllBytes($Path, $wad)
  } finally {
    $writer.Dispose()
    $stream.Dispose()
  }
}

$palette = Get-FreedoomPalette $FreedoomWadPath
$indices = New-FacePatchIndices $SourceImagePath $palette
$patch = New-DoomPatch $indices 24 32
$lumps = [string[]]@(Get-StatusFaceLumpNames)
Write-Pwad $OutWadPath $patch $lumps

Write-Host "Wrote $OutWadPath"
Write-Host "Wrote $OutSourcePath"
Write-Host "Wrote $OutPreviewPath"
Write-Host "Status-face lumps: $($lumps.Count)"
