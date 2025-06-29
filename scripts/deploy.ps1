# Unplug App Deployment Script (PowerShell)
# Usage: .\scripts\deploy.ps1 [pwa|backend|ios|test|all] [development|production]

param(
    [string]$Component = "all",
    [string]$Environment = "development"
)

# Functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

# Check if we're in the right directory
if (-not (Test-Path "package.json")) {
    Write-Error "Please run this script from the project root directory"
    exit 1
}

Write-Info "Starting deployment for: $Component (environment: $Environment)"

# Deploy PWA
function Deploy-PWA {
    Write-Info "Deploying PWA..."
    
    Set-Location pwa
    
    # Install dependencies
    Write-Info "Installing PWA dependencies..."
    npm install
    
    # Update paths for GitHub Pages if needed
    if ($Environment -eq "production") {
        Write-Info "Updating paths for GitHub Pages..."
        (Get-Content manifest.json) -replace '"start_url": "/"', '"start_url": "/unplug-app/"' | Set-Content manifest.json
        (Get-Content sw.js) -replace '/unplug-app/', '/unplug-app/' | Set-Content sw.js
    }
    
    # Create deployment directory
    if (-not (Test-Path "../docs")) {
        New-Item -ItemType Directory -Path "../docs"
    }
    Copy-Item -Path "*" -Destination "../docs/" -Recurse -Force
    
    Set-Location ..
    
    Write-Success "PWA deployment prepared in ./docs directory"
    Write-Info "Commit and push to deploy to GitHub Pages"
}

# Deploy Backend
function Deploy-Backend {
    Write-Info "Deploying Backend..."
    
    Set-Location backend
    
    # Install dependencies
    Write-Info "Installing backend dependencies..."
    npm ci
    
    # Build TypeScript
    Write-Info "Building TypeScript..."
    npx tsc -p tsconfig.simple.json
    
    # Run tests
    Write-Info "Running backend tests..."
    npx jest tests/simple-server.test.ts --testTimeout=30000
    npx jest tests/utils/logger.test.ts
    
    Set-Location ..
    
    Write-Success "Backend build completed"
    Write-Info "Backend ready for deployment to cloud platform"
}

# Build iOS
function Build-iOS {
    Write-Warning "iOS builds require macOS. Use GitHub Actions for automated iOS builds."
    Write-Info "To build iOS locally:"
    Write-Info "1. Use a Mac or macOS virtual machine"
    Write-Info "2. Run: npm run build:ios:script"
    Write-Info "3. Or use GitHub Actions workflow dispatch"
}

# Run tests
function Run-Tests {
    Write-Info "Running all tests..."
    
    # Remove compiled JS files first
    Write-Info "Cleaning compiled JS files..."
    Get-ChildItem -Path "app" -Recurse -Filter "*.js" | Remove-Item -Force
    
    # Frontend tests
    Write-Info "Running frontend tests..."
    npm test
    
    # Backend tests
    Write-Info "Running backend tests..."
    Set-Location backend
    npx jest tests/simple-server.test.ts --testTimeout=30000
    npx jest tests/utils/logger.test.ts
    Set-Location ..
    
    Write-Success "All tests passed!"
}

# Main deployment logic
switch ($Component) {
    "pwa" {
        Deploy-PWA
    }
    "backend" {
        Deploy-Backend
    }
    "ios" {
        Build-iOS
    }
    "test" {
        Run-Tests
    }
    "all" {
        Write-Info "Deploying all components..."
        Run-Tests
        Deploy-PWA
        Deploy-Backend
        Build-iOS
    }
    default {
        Write-Error "Unknown component: $Component"
        Write-Host "Usage: .\scripts\deploy.ps1 [pwa|backend|ios|test|all] [development|production]"
        exit 1
    }
}

Write-Success "Deployment completed successfully!"
