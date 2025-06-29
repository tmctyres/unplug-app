# 📱 Get Unplug App on Your iPhone - Step by Step Guide

## 🎯 Quick Start (Recommended Path)

### Step 1: Setup Your Mac Environment

1. **Install Xcode** (if not already installed):
   ```bash
   # Download from Mac App Store or Apple Developer
   # Xcode 14.0+ required
   ```

2. **Install Node.js** (if not already installed):
   ```bash
   # Download from nodejs.org or use Homebrew
   brew install node
   ```

3. **Install NativeScript CLI**:
   ```bash
   npm install -g @nativescript/cli
   ```

4. **Verify iOS setup**:
   ```bash
   ns doctor ios
   ```

### Step 2: Prepare the Project

1. **Navigate to project directory**:
   ```bash
   cd /path/to/unplug-app
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Use the automated build script**:
   ```bash
   # For debug build (recommended for first try)
   chmod +x scripts/build-ios.sh
   ./scripts/build-ios.sh -x

   # For release build
   ./scripts/build-ios.sh -r -x
   ```

### Step 3: Configure Code Signing in Xcode

1. **When Xcode opens automatically**:
   - Select the "Unplug" project in the navigator
   - Go to "Signing & Capabilities" tab
   - Select your Apple Developer Team (sign in with Apple ID if needed)

2. **For Free Apple ID**:
   - Use your personal Apple ID
   - App will be valid for 7 days
   - You can have max 3 apps per device

3. **For Paid Developer Account ($99/year)**:
   - Use your developer team
   - App will be valid for 1 year
   - Unlimited apps

### Step 4: Install on iPhone

1. **Connect your iPhone** to Mac via USB cable

2. **Trust your Mac** on iPhone when prompted

3. **In Xcode**:
   - Select your iPhone from the device dropdown (top left)
   - Click the "Play" button or press `Cmd + R`
   - App will build and install automatically

4. **Trust the developer** on iPhone:
   - Go to Settings → General → VPN & Device Management
   - Find your developer profile and tap "Trust"

---

## 🔄 Alternative Methods

### Method A: Manual Xcode Build

```bash
# Build the project
ns build ios --for-device --release

# Open in Xcode
ns prepare ios
open platforms/ios/Unplug.xcworkspace
```

### Method B: Using AltStore (No Developer Account Needed)

1. **Install AltStore**:
   - Download AltServer from altstore.io
   - Install AltStore on your iPhone via AltServer

2. **Create IPA file**:
   ```bash
   ./scripts/build-ios.sh -r
   # Then archive in Xcode: Product → Archive → Export
   ```

3. **Sideload with AltStore**:
   - Open AltStore on iPhone
   - Tap "+" and select the Unplug.ipa file
   - Refresh every 7 days

### Method C: Using Sideloadly

1. **Download Sideloadly** from sideloadly.io
2. **Connect iPhone** and drag IPA to Sideloadly
3. **Enter Apple ID** credentials
4. **App installs automatically**

---

## 🛠️ Troubleshooting

### Common Issues & Solutions

**❌ "ns command not found"**
```bash
npm install -g @nativescript/cli
```

**❌ "Xcode not found"**
- Install Xcode from Mac App Store
- Install Xcode Command Line Tools: `xcode-select --install`

**❌ "Untrusted Developer"**
- Settings → General → VPN & Device Management → Trust Developer

**❌ "App crashes on launch"**
- Check iOS version (requires iOS 12.0+)
- Try debug build first: `./scripts/build-ios.sh`

**❌ "Build failed"**
```bash
# Clean and rebuild
./scripts/build-ios.sh -c -r
```

**❌ "Certificate expired"**
- For free accounts: Rebuild and reinstall every 7 days
- For paid accounts: Renew yearly

---

## 📋 What You'll Get

### ✅ Fully Working Features:
- Manual session tracking (start/stop buttons)
- Achievement system with XP and levels
- Local notifications and reminders
- Data persistence (all data stays on your phone)
- Social features and leaderboards
- Analytics dashboard
- Offline functionality

### ⚠️ iOS Limitations:
- No automatic screen time detection (iOS restrictions)
- Manual session tracking required
- Limited background processing

---

## 🚀 Quick Commands Reference

```bash
# One-command build and open Xcode
./scripts/build-ios.sh -x

# Clean build for troubleshooting
./scripts/build-ios.sh -c -r -x

# Check if everything is set up correctly
ns doctor ios

# Just build without opening Xcode
./scripts/build-ios.sh -r
```

---

## 💡 Pro Tips

1. **First Time**: Use debug build (`./scripts/build-ios.sh -x`) for easier troubleshooting
2. **Free Account**: Set calendar reminder to rebuild every 6 days
3. **Multiple Devices**: Each device needs separate installation
4. **Backup**: Export IPA file for easy reinstallation
5. **Updates**: Pull latest code and rebuild to get updates

---

## 🆘 Need Help?

1. **Check the detailed guide**: `IOS_DEPLOYMENT_GUIDE.md`
2. **Verify setup**: Run `ns doctor ios`
3. **Clean build**: Use `-c` flag if issues persist
4. **Check iOS version**: App requires iOS 12.0+

---

## 🎉 Success!

Once installed, you'll have the full Unplug app on your iPhone with:
- Beautiful native iOS interface
- All tracking and achievement features
- Local data storage (private and secure)
- Push notifications for session reminders

Enjoy your digital wellness journey! 📱✨
