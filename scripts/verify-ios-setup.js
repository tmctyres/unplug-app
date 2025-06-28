#!/usr/bin/env node

/**
 * iOS Setup Verification Script
 * Checks that all required iOS deployment files are present
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Verifying iOS Setup for Unplug App');
console.log('=====================================\n');

const requiredFiles = [
  'App_Resources/iOS/Info.plist',
  'App_Resources/iOS/LaunchScreen.storyboard',
  'App_Resources/iOS/build.xcconfig',
  'App_Resources/iOS/Unplug.entitlements',
  'App_Resources/iOS/Assets.xcassets/AppIcon.appiconset/Contents.json',
  'App_Resources/iOS/Assets.xcassets/LaunchImage.launchimage/Contents.json',
  'nativescript.config.ts',
  'package.json'
];

const optionalFiles = [
  'App_Resources/iOS/ICON_GENERATION_GUIDE.md',
  'IOS_DEPLOYMENT_GUIDE.md',
  'scripts/build-ios.sh'
];

let allRequired = true;
let score = 0;
const totalFiles = requiredFiles.length + optionalFiles.length;

console.log('📋 Required Files:');
console.log('------------------');

requiredFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '❌';
  console.log(`${status} ${file}`);
  
  if (exists) {
    score++;
  } else {
    allRequired = false;
  }
});

console.log('\n📄 Optional Files:');
console.log('------------------');

optionalFiles.forEach(file => {
  const exists = fs.existsSync(file);
  const status = exists ? '✅' : '⚠️';
  console.log(`${status} ${file}`);
  
  if (exists) {
    score++;
  }
});

console.log('\n🔧 Configuration Check:');
console.log('-----------------------');

// Check nativescript.config.ts
try {
  const configContent = fs.readFileSync('nativescript.config.ts', 'utf8');
  const hasAppResourcesPath = configContent.includes('appResourcesPath');
  const hasBundleId = configContent.includes('com.unplug.screentime');
  const hasAppName = configContent.includes('Unplug');
  
  console.log(`${hasAppResourcesPath ? '✅' : '❌'} App Resources Path configured`);
  console.log(`${hasBundleId ? '✅' : '❌'} Bundle ID configured (com.unplug.screentime)`);
  console.log(`${hasAppName ? '✅' : '❌'} App Display Name configured (Unplug)`);
} catch (error) {
  console.log('❌ Could not read nativescript.config.ts');
}

// Check package.json
try {
  const packageContent = fs.readFileSync('package.json', 'utf8');
  const packageJson = JSON.parse(packageContent);
  const hasNSCore = packageJson.dependencies && packageJson.dependencies['@nativescript/core'];
  const hasNSWebpack = packageJson.devDependencies && packageJson.devDependencies['@nativescript/webpack'];
  const hasBuildScripts = packageJson.scripts && packageJson.scripts['build:ios'];
  
  console.log(`${hasNSCore ? '✅' : '❌'} NativeScript Core dependency`);
  console.log(`${hasNSWebpack ? '✅' : '❌'} NativeScript Webpack`);
  console.log(`${hasBuildScripts ? '✅' : '❌'} iOS build scripts`);
} catch (error) {
  console.log('❌ Could not read package.json');
}

console.log('\n📊 Summary:');
console.log('-----------');
console.log(`Files Present: ${score}/${totalFiles}`);
console.log(`Completion: ${Math.round((score / totalFiles) * 100)}%`);

if (allRequired) {
  console.log('\n🎉 SUCCESS: All required iOS deployment files are present!');
  console.log('✅ Your project is ready for iOS building on macOS');
  console.log('\n📱 Next Steps:');
  console.log('1. Generate app icons (see ICON_GENERATION_GUIDE.md)');
  console.log('2. Transfer project to macOS');
  console.log('3. Run: ns platform add ios');
  console.log('4. Build: ns build ios --for-device');
} else {
  console.log('\n❌ MISSING: Some required files are missing');
  console.log('Please ensure all required files are created before building');
}

console.log('\n🔗 Helpful Resources:');
console.log('- iOS Deployment Guide: IOS_DEPLOYMENT_GUIDE.md');
console.log('- Icon Generation: App_Resources/iOS/ICON_GENERATION_GUIDE.md');
console.log('- Build Script: scripts/build-ios.sh');
console.log('- Missing Components: MISSING_COMPONENTS_RESOLVED.md');

console.log('\n🚀 Happy building! 📱✨');
