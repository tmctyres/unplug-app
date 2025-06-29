#!/bin/bash

# Unplug App Deployment Script
# Usage: ./scripts/deploy.sh [pwa|backend|ios] [environment]

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Functions
log_info() {
    echo -e "${BLUE}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

# Check if we're in the right directory
if [ ! -f "package.json" ]; then
    log_error "Please run this script from the project root directory"
    exit 1
fi

# Parse arguments
COMPONENT=${1:-"all"}
ENVIRONMENT=${2:-"development"}

log_info "Starting deployment for: $COMPONENT (environment: $ENVIRONMENT)"

# Deploy PWA
deploy_pwa() {
    log_info "Deploying PWA..."
    
    cd pwa
    
    # Install dependencies
    log_info "Installing PWA dependencies..."
    npm install
    
    # Update paths for GitHub Pages if needed
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Updating paths for GitHub Pages..."
        sed -i.bak 's|"start_url": "/"|"start_url": "/unplug-app/"|g' manifest.json
        sed -i.bak 's|/unplug-app/|/unplug-app/|g' sw.js
    fi
    
    # Create deployment directory
    mkdir -p ../docs
    cp -r * ../docs/
    
    cd ..
    
    log_success "PWA deployment prepared in ./docs directory"
    log_info "Commit and push to deploy to GitHub Pages"
}

# Deploy Backend
deploy_backend() {
    log_info "Deploying Backend..."
    
    cd backend
    
    # Install dependencies
    log_info "Installing backend dependencies..."
    npm ci
    
    # Build TypeScript
    log_info "Building TypeScript..."
    npx tsc -p tsconfig.simple.json
    
    # Run tests
    log_info "Running backend tests..."
    npx jest tests/simple-server.test.ts --testTimeout=30000
    npx jest tests/utils/logger.test.ts
    
    cd ..
    
    log_success "Backend build completed"
    log_info "Backend ready for deployment to cloud platform"
}

# Build iOS
build_ios() {
    log_info "Building iOS app..."
    
    # Check if on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        log_warning "iOS builds require macOS. Use GitHub Actions for automated iOS builds."
        return 1
    fi
    
    # Install dependencies
    log_info "Installing dependencies..."
    npm ci
    
    # Remove compiled JS files
    log_info "Cleaning compiled JS files..."
    find app -name "*.js" -not -path "*/node_modules/*" -delete || true
    
    # Check if NativeScript CLI is installed
    if ! command -v ns &> /dev/null; then
        log_info "Installing NativeScript CLI..."
        npm install -g @nativescript/cli
    fi
    
    # Add iOS platform if not exists
    if [ ! -d "platforms/ios" ]; then
        log_info "Adding iOS platform..."
        ns platform add ios
    fi
    
    # Prepare iOS
    log_info "Preparing iOS..."
    ns prepare ios
    
    # Build iOS
    if [ "$ENVIRONMENT" = "production" ]; then
        log_info "Building iOS release..."
        ns build ios --for-device --release
    else
        log_info "Building iOS debug..."
        ns build ios --for-device
    fi
    
    log_success "iOS build completed"
    log_info "Check platforms/ios/build/ for build artifacts"
}

# Run tests
run_tests() {
    log_info "Running all tests..."
    
    # Frontend tests
    log_info "Running frontend tests..."
    npm test
    
    # Backend tests
    log_info "Running backend tests..."
    cd backend
    npx jest tests/simple-server.test.ts --testTimeout=30000
    npx jest tests/utils/logger.test.ts
    cd ..
    
    log_success "All tests passed!"
}

# Main deployment logic
case $COMPONENT in
    "pwa")
        deploy_pwa
        ;;
    "backend")
        deploy_backend
        ;;
    "ios")
        build_ios
        ;;
    "test")
        run_tests
        ;;
    "all")
        log_info "Deploying all components..."
        run_tests
        deploy_pwa
        deploy_backend
        if [[ "$OSTYPE" == "darwin"* ]]; then
            build_ios
        else
            log_warning "Skipping iOS build (requires macOS)"
        fi
        ;;
    *)
        log_error "Unknown component: $COMPONENT"
        echo "Usage: $0 [pwa|backend|ios|test|all] [development|production]"
        exit 1
        ;;
esac

log_success "Deployment completed successfully! 🚀"
