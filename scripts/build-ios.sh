#!/bin/bash

# Unplug iOS Build Script
# This script automates the iOS build process for the Unplug app

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
APP_NAME="Unplug"
BUNDLE_ID="com.unplug.screentime"
BUILD_TYPE="debug"
OPEN_XCODE=false
CLEAN_BUILD=false

# Function to print colored output
print_status() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

print_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

print_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Function to show usage
show_usage() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Options:"
    echo "  -r, --release     Build for release (default: debug)"
    echo "  -c, --clean       Clean build (removes platforms and node_modules)"
    echo "  -x, --xcode       Open Xcode after build"
    echo "  -h, --help        Show this help message"
    echo ""
    echo "Examples:"
    echo "  $0                Build debug version"
    echo "  $0 -r             Build release version"
    echo "  $0 -r -x          Build release and open Xcode"
    echo "  $0 -c -r          Clean build and release"
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -r|--release)
            BUILD_TYPE="release"
            shift
            ;;
        -c|--clean)
            CLEAN_BUILD=true
            shift
            ;;
        -x|--xcode)
            OPEN_XCODE=true
            shift
            ;;
        -h|--help)
            show_usage
            exit 0
            ;;
        *)
            print_error "Unknown option: $1"
            show_usage
            exit 1
            ;;
    esac
done

# Function to check prerequisites
check_prerequisites() {
    print_status "Checking prerequisites..."
    
    # Check if we're on macOS
    if [[ "$OSTYPE" != "darwin"* ]]; then
        print_error "iOS builds require macOS"
        exit 1
    fi
    
    # Check for Node.js
    if ! command -v node &> /dev/null; then
        print_error "Node.js is not installed"
        exit 1
    fi
    
    # Check for NativeScript CLI
    if ! command -v ns &> /dev/null; then
        print_error "NativeScript CLI is not installed. Run: npm install -g @nativescript/cli"
        exit 1
    fi
    
    # Check for Xcode
    if ! command -v xcodebuild &> /dev/null; then
        print_error "Xcode is not installed or command line tools are missing"
        exit 1
    fi
    
    print_success "All prerequisites are met"
}

# Function to clean build
clean_build() {
    print_status "Performing clean build..."
    
    # Remove platforms
    if [ -d "platforms" ]; then
        print_status "Removing platforms directory..."
        rm -rf platforms
    fi
    
    # Remove node_modules
    if [ -d "node_modules" ]; then
        print_status "Removing node_modules directory..."
        rm -rf node_modules
    fi
    
    # Remove package-lock.json
    if [ -f "package-lock.json" ]; then
        print_status "Removing package-lock.json..."
        rm package-lock.json
    fi
    
    print_success "Clean completed"
}

# Function to install dependencies
install_dependencies() {
    print_status "Installing dependencies..."
    npm install
    print_success "Dependencies installed"
}

# Function to add iOS platform
add_ios_platform() {
    print_status "Adding iOS platform..."
    
    if [ ! -d "platforms/ios" ]; then
        ns platform add ios
        print_success "iOS platform added"
    else
        print_status "iOS platform already exists"
    fi
}

# Function to build the app
build_app() {
    print_status "Building $APP_NAME for iOS ($BUILD_TYPE)..."
    
    if [ "$BUILD_TYPE" = "release" ]; then
        ns build ios --for-device --release
    else
        ns build ios --for-device
    fi
    
    print_success "Build completed successfully"
}

# Function to open Xcode
open_xcode() {
    print_status "Opening Xcode..."
    
    if [ -f "platforms/ios/${APP_NAME}.xcworkspace" ]; then
        open "platforms/ios/${APP_NAME}.xcworkspace"
        print_success "Xcode opened"
    elif [ -f "platforms/ios/${APP_NAME}.xcodeproj" ]; then
        open "platforms/ios/${APP_NAME}.xcodeproj"
        print_success "Xcode opened"
    else
        print_warning "Xcode project not found"
    fi
}

# Function to show build information
show_build_info() {
    print_status "Build Information:"
    echo "  App Name: $APP_NAME"
    echo "  Bundle ID: $BUNDLE_ID"
    echo "  Build Type: $BUILD_TYPE"
    echo "  Clean Build: $CLEAN_BUILD"
    echo "  Open Xcode: $OPEN_XCODE"
    echo ""
}

# Function to show next steps
show_next_steps() {
    echo ""
    print_success "Build completed! Next steps:"
    echo ""
    echo "1. Connect your iPhone to your Mac"
    echo "2. Open Xcode and select your device as the target"
    echo "3. Configure code signing with your Apple Developer account"
    echo "4. Build and run the app (Cmd+R)"
    echo ""
    echo "For sideloading without Xcode:"
    echo "1. Archive the app in Xcode (Product → Archive)"
    echo "2. Export as Development/Ad Hoc"
    echo "3. Use AltStore, Sideloadly, or Apple Configurator 2"
    echo ""
    echo "See IOS_DEPLOYMENT_GUIDE.md for detailed instructions"
}

# Main execution
main() {
    echo ""
    echo "🚀 Unplug iOS Build Script"
    echo "=========================="
    echo ""
    
    show_build_info
    check_prerequisites
    
    if [ "$CLEAN_BUILD" = true ]; then
        clean_build
    fi
    
    install_dependencies
    add_ios_platform
    build_app
    
    if [ "$OPEN_XCODE" = true ]; then
        open_xcode
    fi
    
    show_next_steps
}

# Run main function
main
