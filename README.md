# 📱 Unplug - Digital Wellness App

[![CI/CD Pipeline](https://github.com/tmctyres/unplug-app/actions/workflows/ci-cd.yml/badge.svg)](https://github.com/tmctyres/unplug-app/actions/workflows/ci-cd.yml)
[![iOS Build](https://github.com/tmctyres/unplug-app/actions/workflows/ios-build.yml/badge.svg)](https://github.com/tmctyres/unplug-app/actions/workflows/ios-build.yml)
[![Security Scan](https://github.com/tmctyres/unplug-app/actions/workflows/security.yml/badge.svg)](https://github.com/tmctyres/unplug-app/actions/workflows/security.yml)
[![codecov](https://codecov.io/gh/tmctyres/unplug-app/branch/main/graph/badge.svg)](https://codecov.io/gh/tmctyres/unplug-app)

A comprehensive digital wellness app that helps users track their offline time and build healthier digital habits. Available as both a Progressive Web App (PWA) and native mobile app.

## 🌐 **Live PWA Demo**
**Try it now:** [https://tmctyres.github.io/unplug-app/](https://tmctyres.github.io/unplug-app/)

📱 **Install on your device:** Visit the link above and use "Add to Home Screen" on mobile or "Install App" on desktop.

## 📱 **Platform Availability**
- ✅ **Progressive Web App (PWA)** - Works on all devices, installable
- ✅ **NativeScript App** - iOS and Android native apps
- ✅ **Cross-platform** - Same features across all platforms

## ✨ Features

### 📊 **Core Tracking**
- Manual session tracking with timer
- XP and achievement system
- Progressive leveling (50 XP → Level 1, 100 XP → Level 2, etc.)
- Detailed analytics and insights

### 🎮 **Gamification**
- Achievement system with unlockable rewards
- XP-based progression system
- Milestone celebrations
- Progress tracking and streaks

### 👥 **Social Features**
- Friend system and leaderboards
- Achievement sharing
- Community posts and interactions
- Real-time notifications

### 💰 **Monetization**
- Real App Store integration
- Premium features and subscriptions
- Receipt validation system
- Multiple pricing tiers

### 🔧 **Technical Features**
- Offline-first architecture
- Real-time backend integration
- Comprehensive onboarding system
- iOS deployment ready

## 🚀 Quick Start

### Prerequisites
- Node.js (v18 or later)
- NativeScript CLI
- iOS development environment (for iOS builds)

### Installation

```bash
# Clone the repository
git clone https://github.com/YOUR_USERNAME/unplug-app.git
cd unplug-app

# Install dependencies
npm install

# Install backend dependencies
cd backend
npm install
cd ..

# Build backend
cd backend
npm run build:simple
cd ..
```

### Running the App

```bash
# Start the backend (in one terminal)
cd backend
npm run start:simple

# Preview the app (in another terminal)
npm run preview

# Or build for iOS
npm run build:ios:script
```

### Testing

```bash
# Run all tests
npm test

# Backend health check
curl http://localhost:3000/health
```

## 📁 Project Structure

```
unplug-app/
├── app/                    # NativeScript app source
│   ├── services/          # Business logic services
│   ├── view-models/       # MVVM view models
│   ├── views/            # UI components
│   └── utils/            # Utility functions
├── backend/              # Node.js backend
│   ├── src/              # TypeScript source
│   ├── dist/             # Compiled JavaScript
│   └── logs/             # Application logs
├── tests/                # Test suites
└── docs/                 # Documentation
```

## 🔧 Backend API

The backend provides REST APIs for:

- **Authentication**: `/api/auth/*`
- **Social Features**: `/api/social/*`
- **Leaderboards**: `/api/leaderboards/*`
- **Achievements**: `/api/achievements/*`
- **Posts**: `/api/posts/*`
- **Notifications**: `/api/notifications/*`

Backend runs on `http://localhost:3000` by default.

## 📱 iOS Deployment

The app is configured for iOS sideloading:

```bash
# Build for iOS
npm run build:ios:script

# The built app will be in platforms/ios/
```

## 🧪 Testing

Comprehensive test suite with 85+ tests covering:
- Core functionality
- Social features
- Monetization
- Analytics
- View models

```bash
npm test  # All tests should pass ✅
```

## 🛠️ Development

### Available Scripts

```bash
# App development
npm run preview          # NativeScript Preview
npm run build:ios       # Build for iOS

# Backend development  
npm run dev:simple      # Start backend in dev mode
npm run build:simple    # Build backend

# Testing
npm test               # Run all tests
npm run test:watch     # Watch mode
```

## 📄 License

This project is licensed under the MIT License.

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if needed
5. Submit a pull request

## 📞 Support

For questions or issues, please open a GitHub issue.

---

**Built with ❤️ using NativeScript, Node.js, and TypeScript**
