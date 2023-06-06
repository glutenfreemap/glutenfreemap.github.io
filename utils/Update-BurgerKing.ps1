. (Join-Path $PSScriptRoot common.ps1)

$rootDir = Join-Path $PSScriptRoot ".." -Resolve
$outputPath = Join-Path $rootDir "docs" "data" "burgerking.json"
$mainDataPath = Join-Path $rootDir "docs" "data" "data.json"

Write-Host "Parsing the data"

$places = Get-Content (Join-Path $PSScriptRoot "burguerking.csv") | ConvertFrom-Csv

Write-Host "Merging the data"

$previousData = if (Test-Path $outputPath) {
    Get-Content -Raw $outputPath | ConvertFrom-Json
} else {
    @()
}

$mainData = Get-Content $mainDataPath | ConvertFrom-Json
$districts = $mainData.districts

$data = $places `
    | % {
        [string]$id = $_.Nombre
        $previous = $previousData | ? { $_.id -eq $id }

        $place = [ordered]@{
            id = $id
            subtitle = $id
            address =
                if ($previous.fixes.address -ne $null) {
                    $previous.fixes.address
                } else {
                    @(
                        $_.Morada,
                        "$($_.CP) $($_.Local)"
                    )
                }
            position = [ordered]@{
                lat = [double]$_.Latitude
                lng = [double]$_.Longitude
            }
            district = $previous.district
        }
        if ($previous.fixes -ne $null) { $place.fixes = $previous.fixes }

        Write-Output $place
    }

$data `
    | ? { $_.district -eq $null } `
    | Write-Throttled 1000 `
    | % {
        Write-Host "Resolving district for $($_.subtitle)"
        $_.district = Resolve-District $_.position.lat $_.position.lng $districts
    }

Write-Host "Updating the output file"
$data | ConvertTo-Json -Depth 10 | Set-Content $outputPath

Write-Host "Done"
