param(
    [string]$Source = 'src/favicon.ico'
)

$ErrorActionPreference = 'Stop'
Add-Type -AssemblyName System.Drawing

$repositoryRoot = Resolve-Path (Join-Path $PSScriptRoot '..\..')
$sourcePath = Resolve-Path (Join-Path $repositoryRoot $Source)
$resourceRoot = Join-Path $repositoryRoot 'android\app\src\main\res'
$sourceIcon = [System.Drawing.Icon]::new($sourcePath)
$sourceBitmap = $sourceIcon.ToBitmap()

function Write-ScaledPng {
    param(
        [Parameter(Mandatory)] [string]$Path,
        [Parameter(Mandatory)] [int]$CanvasSize,
        [Parameter(Mandatory)] [int]$ArtworkSize,
        [string]$Background = 'Transparent'
    )

    $bitmap = [System.Drawing.Bitmap]::new(
        $CanvasSize,
        $CanvasSize,
        [System.Drawing.Imaging.PixelFormat]::Format32bppArgb
    )
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)

    try {
        $backgroundColor = if ($Background -eq 'Transparent') {
            [System.Drawing.Color]::Transparent
        } else {
            [System.Drawing.ColorTranslator]::FromHtml($Background)
        }
        $graphics.Clear($backgroundColor)
        $graphics.CompositingMode = [System.Drawing.Drawing2D.CompositingMode]::SourceCopy
        $graphics.CompositingQuality = [System.Drawing.Drawing2D.CompositingQuality]::HighSpeed
        $graphics.InterpolationMode = [System.Drawing.Drawing2D.InterpolationMode]::NearestNeighbor
        $graphics.PixelOffsetMode = [System.Drawing.Drawing2D.PixelOffsetMode]::Half
        $graphics.SmoothingMode = [System.Drawing.Drawing2D.SmoothingMode]::None

        $offset = [int][Math]::Floor(($CanvasSize - $ArtworkSize) / 2)
        $graphics.DrawImage(
            $sourceBitmap,
            [System.Drawing.Rectangle]::new($offset, $offset, $ArtworkSize, $ArtworkSize),
            0,
            0,
            $sourceBitmap.Width,
            $sourceBitmap.Height,
            [System.Drawing.GraphicsUnit]::Pixel
        )
        $bitmap.Save($Path, [System.Drawing.Imaging.ImageFormat]::Png)
    }
    finally {
        $graphics.Dispose()
        $bitmap.Dispose()
    }
}

try {
    $densities = @(
        @{ Name = 'mdpi'; Legacy = 48; Foreground = 108 },
        @{ Name = 'hdpi'; Legacy = 72; Foreground = 162 },
        @{ Name = 'xhdpi'; Legacy = 96; Foreground = 216 },
        @{ Name = 'xxhdpi'; Legacy = 144; Foreground = 324 },
        @{ Name = 'xxxhdpi'; Legacy = 192; Foreground = 432 }
    )

    foreach ($density in $densities) {
        $directory = Join-Path $resourceRoot "mipmap-$($density.Name)"
        $foregroundArtwork = [int][Math]::Round($density.Foreground * 0.61)

        Write-ScaledPng -Path (Join-Path $directory 'ic_launcher.png') -CanvasSize $density.Legacy -ArtworkSize $density.Legacy
        Write-ScaledPng -Path (Join-Path $directory 'ic_launcher_round.png') -CanvasSize $density.Legacy -ArtworkSize $density.Legacy
        Write-ScaledPng -Path (Join-Path $directory 'ic_launcher_foreground.png') -CanvasSize $density.Foreground -ArtworkSize $foregroundArtwork
    }

    $webIconDirectory = Join-Path $repositoryRoot 'src\assets\icons'
    Write-ScaledPng -Path (Join-Path $webIconDirectory 'app-icon-192.png') -CanvasSize 192 -ArtworkSize 192
    Write-ScaledPng -Path (Join-Path $webIconDirectory 'app-icon-512.png') -CanvasSize 512 -ArtworkSize 512
    Write-ScaledPng -Path (Join-Path $webIconDirectory 'app-icon-maskable-512.png') -CanvasSize 512 -ArtworkSize 312 -Background '#F4E7CF'
}
finally {
    $sourceBitmap.Dispose()
    $sourceIcon.Dispose()
}

Write-Output 'Iconos Android y PWA generados desde src/favicon.ico.'
