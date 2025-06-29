# 🚀 Unplug PWA - GitHub Pages Deployment

## 📱 Live App
**URL:** `https://tmctyres.github.io/unplug-app/`

## 🔧 Deployment Setup

### Prerequisites
1. GitHub repository with Pages enabled
2. PWA files configured for GitHub Pages paths
3. GitHub Actions workflow for automatic deployment

### Configuration Changes Made

#### 1. Updated `pwa/manifest.json`
- Changed `start_url` from `/` to `/unplug-app/`
- Updated `scope` to `/unplug-app/`
- Updated all shortcut URLs to include base path

#### 2. Updated `pwa/sw.js`
- Modified `STATIC_FILES` array to include `/unplug-app/` prefix
- Updated all cached file paths for GitHub Pages

#### 3. Added `pwa/index.html` base tag
- Added `<base href="/unplug-app/">` for proper resource loading

#### 4. Created GitHub Actions Workflow
- File: `.github/workflows/deploy-pwa.yml`
- Automatically deploys PWA on push to main branch
- Uses GitHub Pages deployment action

## 🚀 Deployment Steps

### Step 1: Enable GitHub Pages
1. Go to your repository settings
2. Navigate to "Pages" section
3. Set source to "GitHub Actions"

### Step 2: Push Changes
```bash
git add .
git commit -m "Configure PWA for GitHub Pages deployment"
git push origin main
```

### Step 3: Monitor Deployment
1. Go to "Actions" tab in your repository
2. Watch the "Deploy PWA to GitHub Pages" workflow
3. Once complete, your PWA will be live!

## 📱 Testing the Deployed PWA

### Desktop Testing
1. Visit `https://tmctyres.github.io/unplug-app/`
2. Check that all resources load correctly
3. Test PWA installation (Chrome: three dots → Install app)

### Mobile Testing
1. Open the URL on your mobile device
2. Test "Add to Home Screen" functionality
3. Verify offline functionality works
4. Test push notifications (if enabled)

## 🔍 Troubleshooting

### Common Issues
1. **404 errors for resources**: Check base tag and manifest paths
2. **Service worker not registering**: Verify SW paths are correct
3. **PWA not installable**: Check manifest.json validation

### Debugging Tools
- Chrome DevTools → Application tab → Manifest
- Chrome DevTools → Application tab → Service Workers
- Lighthouse PWA audit

## 📊 PWA Features Available
- ✅ Offline functionality
- ✅ Add to Home Screen
- ✅ App shortcuts
- ✅ Theme color support
- ✅ Responsive design
- ✅ Service worker caching

## 🔄 Updates and Maintenance

### Updating the PWA
1. Make changes to files in `/pwa/` directory
2. Commit and push to main branch
3. GitHub Actions will automatically redeploy

### Cache Management
- Service worker automatically handles cache updates
- Version number in `sw.js` controls cache invalidation
- Update `CACHE_NAME` when making significant changes

## 📈 Analytics and Monitoring
Consider adding:
- Google Analytics for usage tracking
- Error monitoring (Sentry, LogRocket)
- Performance monitoring (Web Vitals)

## 🎯 Next Steps
1. Test PWA on various devices and browsers
2. Submit to PWA directories (PWA Builder, etc.)
3. Consider app store submission via PWA Builder
4. Set up monitoring and analytics
5. Gather user feedback and iterate
