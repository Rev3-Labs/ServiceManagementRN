# Simple script to create placeholder launcher icons
# This creates minimal valid PNG files for all density folders

$resPath = "app\src\main\res"
$densities = @("mdpi", "hdpi", "xhdpi", "xxhdpi", "xxxhdpi")
$sizes = @(48, 72, 96, 144, 192)  # Sizes in pixels

foreach ($i in 0..($densities.Length - 1)) {
    $density = $densities[$i]
    $size = $sizes[$i]
    $mipmapPath = "$resPath\mipmap-$density"
    
    if (-not (Test-Path $mipmapPath)) {
        New-Item -ItemType Directory -Path $mipmapPath -Force | Out-Null
    }
    
    # Create a simple colored square PNG using .NET
    $bitmap = New-Object System.Drawing.Bitmap($size, $size)
    $graphics = [System.Drawing.Graphics]::FromImage($bitmap)
    $brush = New-Object System.Drawing.SolidBrush([System.Drawing.Color]::FromArgb(0x65, 0xB2, 0x30))
    $graphics.FillRectangle($brush, 0, 0, $size, $size)
    
    # Save as PNG
    $bitmap.Save("$mipmapPath\ic_launcher.png", [System.Drawing.Imaging.ImageFormat]::Png)
    $bitmap.Save("$mipmapPath\ic_launcher_round.png", [System.Drawing.Imaging.ImageFormat]::Png)
    
    $graphics.Dispose()
    $bitmap.Dispose()
    $brush.Dispose()
    
    Write-Host "Created icons for $density"
}

Write-Host "Icon generation complete!"










