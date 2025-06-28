# iOS Deployment Guide for Unplug App

This guide will help you build and install the Unplug app on your iPhone without using the App Store.

## Prerequisites

### 1. Development Environment Setup

**Required Software:**
- macOS (required for iOS development)
- Xcode 14.0 or later
- Node.js 16.0 or later
- NativeScript CLI 8.0 or later

**Install NativeScript CLI:**
```bash
npm install -g @nativescript/cli
```

**Verify Installation:**
```bash
ns doctor ios
```

### 2. Apple Developer Account

You have several options for signing:

**Option A: Free Apple Developer Account**
- Sign in with your Apple ID in Xcode
- Limited to 7 days before re-signing required
- Maximum 3 apps per device

**Option B: Paid Apple Developer Account ($99/year)**
- 1-year certificate validity
- Unlimited apps
- TestFlight distribution capability

## Build Configuration

### 1. Update App Identifier

The app is configured with bundle ID: `com.unplug.screentime`

If you need to change it, edit `nativescript.config.ts`:
```typescript
export default {
  id: 'com.yourname.unplug', // Change this
  // ... rest of config
}
```

### 2. iOS-Specific Settings

The app is configured with:
- Minimum iOS version: 12.0
- Optimized for iPhone and iPad
- Background app refresh capabilities
- Local notifications support

## Building the App

### 1. Install Dependencies

```bash
cd /path/to/unplug-project
npm install
```

### 2. Add iOS Platform

```bash
ns platform add ios
```

### 3. Build for Device

**Debug Build (for testing):**
```bash
ns build ios --for-device
```

**Release Build (for distribution):**
```bash
ns build ios --for-device --release
```

### 4. Open in Xcode

```bash
ns prepare ios
open platforms/ios/UnplugApp.xcworkspace
```

## Code Signing & Installation

### Method 1: Direct Installation via Xcode

1. **Open Project in Xcode:**
   - Open `platforms/ios/UnplugApp.xcworkspace`
   - Select your development team in project settings
   - Choose your connected iPhone as the target device

2. **Configure Signing:**
   - Go to Project Settings → Signing & Capabilities
   - Select your Apple Developer Team
   - Xcode will automatically manage provisioning profiles

3. **Build and Install:**
   - Click the "Play" button or press Cmd+R
   - App will build and install on your connected iPhone

### Method 2: Manual IPA Installation

1. **Create IPA File:**
   ```bash
   ns build ios --for-device --release
   ```

2. **Archive in Xcode:**
   - Product → Archive
   - Export for Development/Ad Hoc distribution
   - Save the .ipa file

3. **Install via Tools:**
   - **Apple Configurator 2** (Mac App Store)
   - **3uTools** (Third-party)
   - **AltStore** (Alternative app store)

### Method 3: TestFlight (Paid Developer Account)

1. **Upload to App Store Connect:**
   - Archive in Xcode
   - Upload to App Store Connect
   - Add to TestFlight

2. **Invite Testers:**
   - Add email addresses in TestFlight
   - Testers receive invitation email
   - Install via TestFlight app

## Sideloading Options

### Option 1: AltStore (Recommended for Free Accounts)

1. **Install AltStore:**
   - Download from altstore.io
   - Install AltServer on your Mac
   - Install AltStore on your iPhone

2. **Sideload Unplug:**
   - Open AltStore on iPhone
   - Tap "+" and select the Unplug .ipa file
   - App will install with 7-day certificate

3. **Refresh Weekly:**
   - AltStore can auto-refresh certificates
   - Or manually refresh every 7 days

### Option 2: Sideloadly

1. **Install Sideloadly:**
   - Download from sideloadly.io
   - Install on Mac or Windows

2. **Sideload Process:**
   - Connect iPhone via USB
   - Drag .ipa file to Sideloadly
   - Enter Apple ID credentials
   - App installs automatically

## Troubleshooting

### Common Issues

**"Untrusted Developer" Error:**
1. Go to Settings → General → VPN & Device Management
2. Find your developer profile
3. Tap "Trust [Your Name]"

**App Crashes on Launch:**
1. Check iOS version compatibility (iOS 12.0+)
2. Verify all dependencies are iOS-compatible
3. Check device logs in Xcode Console

**Build Errors:**
1. Clean build folder: `ns clean`
2. Remove and re-add iOS platform:
   ```bash
   ns platform remove ios
   ns platform add ios
   ```
3. Update dependencies: `npm update`

**Certificate Expired:**
1. Re-sign with fresh certificate
2. For free accounts: rebuild and reinstall every 7 days
3. For paid accounts: certificates last 1 year

### Performance Optimization

**For Release Builds:**
1. Enable webpack optimizations
2. Use `--release` flag for production builds
3. Test on actual devices, not just simulator

**Memory Management:**
- The app is optimized for iOS memory constraints
- Background processing is limited to essential features
- Local storage is used efficiently

## App Features on iOS

### Fully Supported:
- ✅ Manual session tracking
- ✅ Achievement system
- ✅ Local notifications
- ✅ Data persistence
- ✅ Social features
- ✅ Analytics dashboard
- ✅ Offline functionality

### iOS-Specific Limitations:
- ❌ Automatic screen time detection (iOS restrictions)
- ❌ Background app usage monitoring
- ⚠️ Limited background processing

### Workarounds:
- Manual session start/stop for tracking
- Notification reminders for session breaks
- Widget support for quick access (future update)

## Distribution Options

### Personal Use:
- Direct installation via Xcode
- AltStore sideloading
- Free developer account signing

### Family/Friends:
- TestFlight (up to 100 testers)
- Ad Hoc distribution (up to 100 devices)
- Enterprise distribution (if available)

### Public Release:
- App Store submission (requires review)
- Alternative app stores (limited options on iOS)

## Security Considerations

### Data Privacy:
- All data stored locally on device
- No cloud sync without explicit user consent
- Minimal permissions required

### Code Signing:
- Always use trusted certificates
- Verify app integrity before installation
- Keep certificates secure and private

## Next Steps

1. **Test Thoroughly:**
   - Install on multiple iOS devices
   - Test all features extensively
   - Verify performance on older devices

2. **Gather Feedback:**
   - Use TestFlight for beta testing
   - Collect crash reports and analytics
   - Iterate based on user feedback

3. **Consider App Store:**
   - Prepare for App Store review guidelines
   - Implement required privacy policies
   - Plan marketing and distribution strategy

## Support

For technical issues:
1. Check NativeScript iOS documentation
2. Review Apple Developer documentation
3. Test on physical devices when possible
4. Use Xcode debugging tools for troubleshooting

Remember: iOS development requires patience and testing on real devices for the best results!
