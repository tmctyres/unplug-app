# CI/CD Pipeline Setup for Unplug App

## 🚀 Overview

This document describes the comprehensive CI/CD pipeline setup for the Unplug app, including automated testing, building, security scanning, and deployment.

## 📋 Pipeline Components

### 1. Main CI/CD Pipeline (`.github/workflows/ci-cd.yml`)

**Triggers:**
- Push to `main` or `develop` branches
- Pull requests to `main` branch

**Jobs:**
- **Frontend Tests**: NativeScript app testing with Jest
- **Backend Tests**: Node.js/Express API testing
- **PWA Tests**: Progressive Web App testing with Lighthouse
- **Code Quality**: TypeScript checking and security audits
- **Build**: Production build creation (main branch only)
- **Deploy PWA**: Automatic deployment to GitHub Pages
- **Deploy Backend**: Optional deployment to Railway/Heroku

### 2. iOS Build Pipeline (`.github/workflows/ios-build.yml`)

**Triggers:**
- Manual workflow dispatch
- Push to `main` branch (app changes only)

**Features:**
- macOS runner with Xcode
- Debug and release builds
- Artifact archiving
- Code signing preparation

### 3. Security Pipeline (`.github/workflows/security.yml`)

**Triggers:**
- Weekly schedule (Mondays at 2 AM)
- Push/PR to main branch

**Scans:**
- Dependency vulnerability scanning
- CodeQL static analysis
- Secret detection with TruffleHog

## 🔧 Setup Instructions

### 1. Repository Configuration

1. **Enable GitHub Pages:**
   ```bash
   # Go to repository Settings > Pages
   # Set source to "GitHub Actions"
   ```

2. **Configure Repository Secrets:**
   ```
   Settings > Secrets and variables > Actions > New repository secret
   ```

### 2. Required Secrets (Optional)

For automatic backend deployment, configure these secrets:

**Heroku Deployment:**
- `HEROKU_API_KEY`: Your Heroku API key
- `HEROKU_APP_NAME`: Your Heroku app name
- `HEROKU_EMAIL`: Your Heroku account email

**Railway Deployment:**
- `RAILWAY_TOKEN`: Your Railway deployment token

**iOS Code Signing (for release builds):**
- `IOS_CERTIFICATE_BASE64`: Base64 encoded certificate
- `IOS_CERTIFICATE_PASSWORD`: Certificate password
- `IOS_PROVISIONING_PROFILE_BASE64`: Base64 encoded provisioning profile

### 3. Branch Protection Rules

Recommended branch protection for `main`:

```yaml
# Settings > Branches > Add rule
Branch name pattern: main
Restrictions:
  ✅ Require a pull request before merging
  ✅ Require status checks to pass before merging
  ✅ Require branches to be up to date before merging
  ✅ Require conversation resolution before merging
  ✅ Include administrators
```

Required status checks:
- `Frontend Tests`
- `Backend Tests`
- `PWA Tests`
- `Code Quality`

## 📊 Pipeline Features

### Automated Testing
- **Frontend**: 85 Jest tests covering models, services, and view models
- **Backend**: API endpoint testing with Supertest
- **PWA**: Lighthouse performance and PWA compliance testing
- **Coverage**: Automatic coverage reporting with Codecov

### Code Quality
- **TypeScript**: Strict type checking for all components
- **Security**: Dependency vulnerability scanning
- **Secrets**: Automatic secret detection
- **Performance**: Lighthouse performance auditing

### Deployment
- **PWA**: Automatic deployment to GitHub Pages
- **Backend**: Configurable deployment to cloud platforms
- **iOS**: Manual build triggers with artifact archiving
- **Artifacts**: Build artifacts available for download

### Security
- **Weekly Scans**: Automated security scanning
- **Dependency Audits**: npm audit for all components
- **Static Analysis**: CodeQL security analysis
- **Secret Detection**: TruffleHog secret scanning

## 🎯 Usage

### Running Tests Locally
```bash
# Frontend tests
npm test

# Backend tests
cd backend
npx jest tests/simple-server.test.ts
npx jest tests/utils/logger.test.ts

# PWA tests
cd pwa
npm start
# Run Lighthouse audit manually
```

### Manual iOS Build
```bash
# Trigger manual iOS build
# Go to Actions > iOS Build > Run workflow
# Select build type (debug/release)
```

### Deployment
```bash
# PWA deploys automatically on main branch push
# Backend deployment requires secret configuration
# iOS builds create downloadable artifacts
```

## 📈 Monitoring

### Build Status
- Check Actions tab for pipeline status
- Green checkmarks indicate successful builds
- Red X marks indicate failures requiring attention

### Coverage Reports
- Coverage reports uploaded to Codecov
- View detailed coverage at codecov.io/gh/username/repo

### Security Alerts
- Security vulnerabilities reported in Security tab
- Dependabot alerts for dependency updates
- CodeQL findings in Security > Code scanning

## 🔄 Maintenance

### Regular Tasks
1. **Weekly**: Review security scan results
2. **Monthly**: Update dependencies and review audit results
3. **Quarterly**: Review and update pipeline configurations

### Troubleshooting
- **Failed Tests**: Check test logs in Actions tab
- **Build Failures**: Review build logs and error messages
- **Deployment Issues**: Verify secrets and configuration
- **iOS Builds**: Ensure macOS runner availability

## 📚 Additional Resources

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [NativeScript CI/CD Guide](https://docs.nativescript.org/tooling/ci-cd)
- [Lighthouse CI Documentation](https://github.com/GoogleChrome/lighthouse-ci)
- [CodeQL Documentation](https://codeql.github.com/docs/)

---

**Status**: ✅ CI/CD Pipeline Ready  
**Last Updated**: 2025-06-29  
**Maintainer**: Unplug Development Team
