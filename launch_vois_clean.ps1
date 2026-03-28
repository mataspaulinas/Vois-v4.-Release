$repoRoot = $PSScriptRoot

Start-Process powershell.exe -ArgumentList "-ExecutionPolicy", "Bypass", "-NoExit", "-File", "$repoRoot\launch_vois_api_8001.ps1" | Out-Null
Start-Process cmd.exe -ArgumentList "/k", """$repoRoot\launch_vois_web_5174.cmd""" | Out-Null

Write-Host "VOIS backend launching at http://127.0.0.1:8001"
Write-Host "VOIS frontend launching at http://127.0.0.1:5174"
