# nuget restore -PackagesDirectory packages

$url = "https://www.mcdonalds.pt/restaurantes"

. (Join-Path $PSScriptRoot common.ps1)

$rootDir = Join-Path $PSScriptRoot ".." -Resolve
$outputPath = Join-Path $rootDir "site" "data" "mcdonalds.json"
$mainDataPath = Join-Path $rootDir "site" "data" "data.json"

Add-Type -AssemblyName "$PSScriptRoot/packages/HtmlAgilityPack.1.11.46/lib/netstandard2.0/HtmlAgilityPack.dll"

Write-Host "Scraping the page"

$page = Invoke-WebRequest `
    -UseBasicParsing `
    -Uri $url `
    @HttpClientCommonParams

$doc = New-Object HtmlAgilityPack.HtmlDocument
$doc.LoadHtml($page.Content)
$places = $doc.DocumentNode.SelectNodes("//section[contains(@class, ' restaurantMapList__listing ')]//a[@class='contentList__item']")

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
        $id = $_.Attributes["href"].Value -replace '/restaurantes/',''
        $previous = $previousData | ? { $_.id -eq $id }
        $article = $_.SelectSingleNode("article")

        $place = [ordered]@{
            id = $id
            subtitle = [System.Web.HttpUtility]::HtmlDecode($article.SelectSingleNode("p[@class='listedItem__description']/text()").Text.Trim())
            address =
                if ($previous.fixes.address -ne $null) {
                    $previous.fixes.address
                } else {
                    $previous.address
                }
            position = [ordered]@{
                lat = $article.Attributes["data-lat"].Value
                lng = $article.Attributes["data-lng"].Value
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

$data `
    | ? { $_.address -eq $null } `
    | Write-Throttled 1000 `
    | % {
        Write-Host "Getting address for $($_.subtitle)"
        $page = Invoke-WebRequest `
            -UseBasicParsing `
            -Uri "$url/$($_.id)" `
            @HttpClientCommonParams

        $doc = New-Object HtmlAgilityPack.HtmlDocument
        $doc.LoadHtml($page.Content)
        $address = $doc.DocumentNode.SelectNodes("//div[@class='info']/p[not(@class='phone')]/text()") `
            | % { [System.Web.HttpUtility]::HtmlDecode($_.Text.Trim()) } `
            | Get-UniqueUnsorted

        $_.address = $address
    }

Write-Host "Updating the output file"
$data | ConvertTo-Json -Depth 10 | Set-Content $outputPath

Write-Host "Done"
