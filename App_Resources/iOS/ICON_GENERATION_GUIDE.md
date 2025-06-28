# iOS App Icon Generation Guide

## Required Icon Sizes

Your Unplug app needs the following icon sizes for iOS:

### iPhone Icons
- **20x20** (2x = 40x40, 3x = 60x60) - Spotlight, Settings
- **29x29** (2x = 58x58, 3x = 87x87) - Settings
- **40x40** (2x = 80x80, 3x = 120x120) - Spotlight
- **60x60** (2x = 120x120, 3x = 180x180) - App Icon

### iPad Icons
- **20x20** (1x = 20x20, 2x = 40x40) - Spotlight, Settings
- **29x29** (1x = 29x29, 2x = 58x58) - Settings
- **40x40** (1x = 40x40, 2x = 80x80) - Spotlight
- **76x76** (1x = 76x76, 2x = 152x152) - App Icon
- **83.5x83.5** (2x = 167x167) - App Icon (iPad Pro)

### App Store
- **1024x1024** - App Store listing

## Icon Design Guidelines

### Design Requirements
1. **Square format** - All icons must be square
2. **No transparency** - iOS will reject icons with alpha channels
3. **High resolution** - Use vector graphics or high-DPI images
4. **Consistent design** - All sizes should look cohesive

### Recommended Design
Since your app is called "Unplug" and focuses on digital wellness:

**Option 1: Minimalist Plug Icon**
- Simple electrical plug silhouette
- Clean, modern design
- Blue/purple gradient (matching your app theme)

**Option 2: Star/Zen Icon**
- Star symbol (🌟) as used in your app
- Gradient background
- Clean, calming aesthetic

**Option 3: Phone with Slash**
- Phone icon with a diagonal line through it
- Represents "unplugging" from devices
- Modern, recognizable symbol

## How to Generate Icons

### Method 1: Online Icon Generators (Recommended)
1. **AppIcon.co** (Free)
   - Upload a 1024x1024 master icon
   - Automatically generates all required sizes
   - Download the complete icon set

2. **IconKitchen** (Free)
   - Similar to AppIcon.co
   - Good for quick generation

3. **Figma/Sketch** (Design Tools)
   - Create your icon in vector format
   - Export all required sizes manually

### Method 2: Manual Creation
1. Create a 1024x1024 master icon
2. Use image editing software to resize to all required dimensions
3. Ensure each size looks crisp and clear

## Installation Instructions

1. **Generate your icons** using one of the methods above
2. **Replace placeholder files** in `App_Resources/iOS/Assets.xcassets/AppIcon.appiconset/`
3. **Name the files correctly**:
   - Follow the naming convention in Contents.json
   - Or use Xcode to drag and drop icons into the AppIcon set

### File Naming Convention
- `icon-20@2x.png` (40x40)
- `icon-20@3x.png` (60x60)
- `icon-29@2x.png` (58x58)
- `icon-29@3x.png` (87x87)
- `icon-40@2x.png` (80x80)
- `icon-40@3x.png` (120x120)
- `icon-60@2x.png` (120x120)
- `icon-60@3x.png` (180x180)
- `icon-1024.png` (1024x1024)

## Quick Start with Placeholder

For immediate testing, you can:
1. Create a simple 1024x1024 PNG with your app name
2. Use an online generator to create all sizes
3. Replace the generated files in the AppIcon.appiconset folder

## Verification

After adding your icons:
1. Build the project: `ns build ios`
2. Check that icons appear correctly in Xcode
3. Test on device to ensure all icons display properly

## Tips

- **Test on device** - Icons may look different on actual devices
- **Use vector graphics** when possible for crisp scaling
- **Keep it simple** - Complex designs don't work well at small sizes
- **Follow Apple's guidelines** - Check Apple's Human Interface Guidelines for icon design

Your app will use these icons for:
- Home screen app icon
- Settings app
- Spotlight search
- App Store listing
- Notification badges
