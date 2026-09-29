Add-Type -AssemblyName System.Drawing
$lgPath = 'C:\Users\LAPTOP\.gemini\antigravity\brain\2c2136c7-b0ec-49e9-8c7d-e6a2c602268b\media__1778837873448.png'
$rgPath = 'C:\Users\LAPTOP\.gemini\antigravity\brain\2c2136c7-b0ec-49e9-8c7d-e6a2c602268b\media__1778837905180.png'

function Remove-White([string]$Path) {
    $bmp = New-Object System.Drawing.Bitmap($Path)
    $bmp.MakeTransparent([System.Drawing.Color]::White)
    
    # Also remove near-white manually if needed, but MakeTransparent on White is very fast. 
    # Let's do the manual pixel walk because JPEG artifacts might cause near-white.
    $newBmp = New-Object System.Drawing.Bitmap($bmp.Width, $bmp.Height)
    for ($x = 0; $x -lt $bmp.Width; $x++) {
        for ($y = 0; $y -lt $bmp.Height; $y++) {
            $pixel = $bmp.GetPixel($x, $y)
            if ($pixel.R -gt 230 -and $pixel.G -gt 230 -and $pixel.B -gt 230) {
                $newBmp.SetPixel($x, $y, [System.Drawing.Color]::Transparent)
            } else {
                $newBmp.SetPixel($x, $y, $pixel)
            }
        }
    }
    
    $ms = New-Object System.IO.MemoryStream
    $newBmp.Save($ms, [System.Drawing.Imaging.ImageFormat]::Png)
    $base64 = [System.Convert]::ToBase64String($ms.ToArray())
    $bmp.Dispose()
    $newBmp.Dispose()
    $ms.Dispose()
    return "data:image/png;base64," + $base64
}

$lgBase64 = Remove-White $lgPath
$rgBase64 = Remove-White $rgPath

$jsonContent = Get-Content -Path 'lib\assetsBase64.json' -Raw | ConvertFrom-Json
$jsonContent.LG = $lgBase64
$jsonContent.RG = $rgBase64
$jsonContent | ConvertTo-Json -Depth 10 -Compress | Set-Content -Path 'lib\assetsBase64.json' -Encoding UTF8
Write-Output "Done processing images with System.Drawing!"
