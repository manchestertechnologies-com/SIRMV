# Rebuilds manifest.json from the image files in this folder (name without extension = tile id)
Set-Location $PSScriptRoot
$map = [ordered]@{}
Get-ChildItem -File | Where-Object { $_.Extension -in '.png','.svg','.webp','.jpg','.jpeg' } | Sort-Object Name | ForEach-Object {
  $map[$_.BaseName] = $_.Name
}
($map | ConvertTo-Json) | Set-Content -Encoding UTF8 manifest.json
Write-Host "manifest.json written with $($map.Count) icon(s)"
