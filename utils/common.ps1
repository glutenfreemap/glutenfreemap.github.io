
$HttpClientCommonParams = @{
    Headers = @{ Referer="https://glutenfreemap.org" }
    UserAgent = "GlutenFreeMap (glutenfreemap@aaubry.net)"
}

function Write-Throttled([int]$DelayMs)
{
    begin
    {
        $throttleNext = $false
    }
    process
    {
        if ($throttleNext)
        {
            Start-Sleep -Milliseconds $DelayMs
        }
        $throttleNext = $true
        Write-Output $_
    }
}

function Resolve-GeoAddress($lat, $lng)
{
    $response = Invoke-WebRequest `
        -UseBasicParsing `
        -Uri "https://nominatim.openstreetmap.org/reverse?format=json&lat=$lat&lon=$lng&email=purpledragon@aaubry.net" `
        @HttpClientCommonParams

    return $response.Content | ConvertFrom-Json
}

function Resolve-District($lat, $lng, $districts)
{
    $lookup = Resolve-GeoAddress $lat $lng

    $district = $districts `
        | ? { $_.name -eq $lookup.address.county -or $_.name -eq $lookup.address.archipelago } `
        | % { $_.id }

    if ($null -eq $district) {
        Write-Warning "Could not resolve district '$($lookup.address.county)' / '$($lookup.address.archipelago)'"
    }

    return $district
}

function Get-UniqueUnsorted
{
    begin
    {
        $uniqueValues = @{}
    }
    process
    {
        if (-not $uniqueValues.ContainsKey($_))
        {
            $uniqueValues.Add($_, $null)
            Write-Output $_
        }
    }
}

# https://lazywinadmin.com/2015/05/powershell-remove-diacritics-accents.html
function Remove-StringDiacritic
{
<#
    .SYNOPSIS
        This function will remove the diacritics (accents) characters from a string.
        
    .DESCRIPTION
        This function will remove the diacritics (accents) characters from a string.
    
    .PARAMETER String
        Specifies the String on which the diacritics need to be removed
    
    .PARAMETER NormalizationForm
        Specifies the normalization form to use
        https://msdn.microsoft.com/en-us/library/system.text.normalizationform(v=vs.110).aspx
    
    .EXAMPLE
        PS C:\> Remove-StringDiacritic "L'été de Raphaël"
        
        L'ete de Raphael
    
    .NOTES
        Francois-Xavier Cat
        @lazywinadmin
        www.lazywinadmin.com
#>
    
    param
    (
        [ValidateNotNullOrEmpty()]
        [Alias('Text')]
        [System.String]$String,
        [System.Text.NormalizationForm]$NormalizationForm = "FormD"
    )
    
    BEGIN
    {
        $Normalized = $String.Normalize($NormalizationForm)
        $NewString = New-Object -TypeName System.Text.StringBuilder
        
    }
    PROCESS
    {
        $normalized.ToCharArray() | ForEach-Object -Process {
            if ([Globalization.CharUnicodeInfo]::GetUnicodeCategory($psitem) -ne [Globalization.UnicodeCategory]::NonSpacingMark)
            {
                [void]$NewString.Append($psitem)
            }
        }
    }
    END
    {
        Write-Output $($NewString -as [string])
    }
}