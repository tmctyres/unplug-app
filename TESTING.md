# Testing Guide for Offtime Tracker

This guide explains how to test the Offtime Tracker NativeScript app using different methods.

## Prerequisites

### 1. Fix PowerShell Execution Policy (Windows)
```powershell
# Run PowerShell as Administrator
Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Install NativeScript CLI (if not already installed)
```bash
npm install -g @nativescript/cli
```

## Testing Methods

### 1. Unit Testing (Recommended for Development)

We've set up Jest for unit testing the business logic:

```bash
# Run all tests
npm test

# Run tests in watch mode (re-runs on file changes)
npm run test:watch

# Run tests with coverage report
npm test -- --coverage
```

**What's tested:**
- `TrackingService`: Session management, duration formatting, platform detection
- `UserDataService`: User data management, achievements, XP system, streaks
- `MainViewModel`: UI logic, event handling, data binding

**Test files location:**
- `tests/services/tracking-service.test.ts`
- `tests/models/user-data.test.ts`
- `tests/view-models/main-view-model.test.ts`

### 2. Device/Emulator Testing

#### Android Testing
```bash
# Build and run on Android device/emulator
npm run run:android

# Debug mode (with Chrome DevTools)
npm run debug:android

# Build only (without running)
npm run build:android
```

#### iOS Testing (Mac only)
```bash
# Build and run on iOS device/simulator
npm run run:ios

# Debug mode
npm run debug:ios

# Build only
npm run build:ios
```

### 3. NativeScript Preview (Quick Testing)

For rapid testing without setting up emulators:

1. Install "NativeScript Preview" app on your phone from app stores
2. Run the preview command:
```bash
npm run preview
```
3. Scan the QR code with the Preview app

**Limitations:**
- Cannot test native Android automatic tracking features
- Limited to basic functionality testing

### 4. Manual Testing Checklist

#### Core Functionality
- [ ] **Manual Session Start/Stop** (iOS and Android manual mode)
  - Start a session manually
  - Verify timer updates every minute
  - End session and check XP/time is recorded

- [ ] **Automatic Tracking** (Android only)
  - Turn screen off for 5+ minutes
  - Turn screen back on
  - Verify session was recorded automatically

#### Gamification Features
- [ ] **XP System**
  - Complete sessions and verify XP is awarded (1 XP per minute)
  - Check level progression (every 1000 XP)

- [ ] **Achievements**
  - Test "First Steps" (30 minutes offline)
  - Test "Digital Minimalist" (2 hours offline)
  - Verify achievement notifications appear

- [ ] **Streaks**
  - Meet daily goal for consecutive days
  - Verify streak counter increases
  - Test streak breaking and reset

#### UI/UX Testing
- [ ] **Welcome Messages**
  - Check time-based greetings (morning/afternoon/evening)
  - Verify motivational messages change based on progress

- [ ] **Progress Displays**
  - Daily goal progress bar
  - Level progress bar
  - Today's stats accuracy

- [ ] **Navigation**
  - Settings page navigation
  - Achievements page navigation
  - Statistics page navigation

#### Data Persistence
- [ ] **App Restart**
  - Close and reopen app
  - Verify all data persists (XP, level, streaks, settings)

- [ ] **Settings**
  - Change daily goal
  - Toggle notifications
  - Verify settings are saved

### 5. Performance Testing

#### Memory Usage
```bash
# Monitor memory usage during long sessions
npm run debug:android
# Use Chrome DevTools Memory tab
```

#### Battery Impact
- Test automatic tracking for extended periods
- Monitor battery drain on device

### 6. Platform-Specific Testing

#### Android Specific
- [ ] Screen on/off detection accuracy
- [ ] Usage stats permission request
- [ ] Background session tracking
- [ ] Local notifications delivery

#### iOS Specific
- [ ] Manual session controls work properly
- [ ] App state management
- [ ] Local notifications permissions and delivery

## Troubleshooting

### Common Issues

1. **Tests failing with module resolution errors**
   - Ensure all dependencies are installed: `npm install`
   - Check Jest configuration in `jest.config.js`

2. **Android emulator not detected**
   - Start Android Studio and launch an emulator
   - Verify with: `adb devices`

3. **iOS simulator issues (Mac only)**
   - Open Xcode and start a simulator
   - Verify with: `xcrun simctl list devices`

4. **NativeScript CLI not found**
   - Install globally: `npm install -g @nativescript/cli`
   - Verify with: `ns --version`

### Debug Commands

```bash
# Clean build artifacts
npm run clean

# Check NativeScript environment
ns doctor

# View connected devices
ns devices

# Check app logs
ns logs android
ns logs ios
```

## Continuous Integration

For automated testing in CI/CD pipelines, focus on unit tests:

```yaml
# Example GitHub Actions workflow
- name: Run Tests
  run: |
    npm install
    npm test -- --coverage --watchAll=false
```

## Test Coverage Goals

- **Services**: 90%+ coverage
- **View Models**: 80%+ coverage
- **Models**: 85%+ coverage

Run `npm test -- --coverage` to see current coverage reports.
