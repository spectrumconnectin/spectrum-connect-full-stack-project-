# Kill all Python processes
Get-Process -Name python -ErrorAction SilentlyContinue | Stop-Process -Force

# Wait for processes to terminate
Start-Sleep -Seconds 2

# Start fresh server
Set-Location "d:\Spectrum Connect"
python -m uvicorn app.main:app --reload --port 8000
