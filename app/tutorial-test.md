# 🎓 Tutorial System Testing Guide

## Quick Start Testing

### Method 1: Fresh App Experience (Recommended)
1. **Run the app**: `ns run ios` or `ns run android`
2. **Fresh install simulation**: The app will automatically start with onboarding
3. **Follow the flow**:
   - Welcome screen
   - **NEW**: Personality assessment (3 quick questions)
   - Tracking mode selection
   - **Personalized** daily goal recommendation
   - **Adaptive** gamification preferences
   - **Customized** notification settings
   - Complete onboarding → **Main app tutorial starts automatically**

### Method 2: Debug Menu (For Testing)
1. **Run the app** and get to the main page
2. **Tap the 🎓 icon** in the top-left of the action bar
3. **Choose from debug options**:
   - "Main App Tour" - Test the guided walkthrough
   - "Reset Onboarding" - Go through personalized setup again
   - "Test Feature Tooltip" - See tooltip system
   - "Check Feature Unlocks" - Trigger feature unlock checks

## What You'll Experience

### 🧠 Personalized Onboarding
- **Personality Assessment**: Answer 3 questions about motivation, tracking style, and social preferences
- **Smart Recommendations**: Get personalized daily goal suggestions
- **Adaptive Content**: Onboarding text changes based on your personality type
- **Four Personality Types**:
  - 🏆 **Achiever**: Competitive, data-driven experience
  - 👥 **Socializer**: Community-focused features
  - 🔍 **Explorer**: Feature-rich, experimental
  - 🧘 **Minimalist**: Simple, zen-focused

### 🎯 Interactive Main App Tour
- **Step-by-step guidance** through key features
- **Visual highlights** of important UI elements
- **Progress indicator** showing current step
- **Skip/back navigation** for user control
- **Contextual explanations** for each feature

### ✨ Progressive Feature Discovery
- **Features unlock gradually** based on progress
- **Smart tooltips** appear when new features become available
- **"Coming Soon" section** shows what's next to unlock
- **Contextual timing** - tooltips appear after achievements, level-ups, etc.

### 🎮 Feature Unlock Progression
1. **Level 1**: Basic tracking, session controls
2. **After 1st session**: Achievements, level system, basic stats
3. **After 3 sessions**: Analytics dashboard, session notes
4. **Level 3**: Social features (profile, circles)
5. **Level 4+**: Advanced features (challenges, leaderboards)
6. **After 10 sessions**: Premium feature recommendations

## Testing Scenarios

### Scenario A: Achiever Personality
1. Choose "Achieving goals and competing" for motivation
2. Choose "Detailed analytics and data" for tracking
3. Choose "Very social - share and compete" for social
4. **Expected**: 5-hour goal recommendation, competitive features emphasized

### Scenario B: Minimalist Personality  
1. Choose "Simplicity and minimalism" for motivation
2. Choose "Simple goals and milestones" for tracking
3. Choose "Private - just for me" for social
4. **Expected**: 2-hour goal recommendation, simple interface, minimal gamification

### Scenario C: Feature Unlock Testing
1. Complete onboarding
2. Start and complete 1 offline session
3. **Expected**: Achievement tooltip appears, achievements button becomes visible
4. Complete 3 sessions total
5. **Expected**: Analytics tooltip appears, analytics button becomes visible

## Troubleshooting

### If tutorials don't appear:
1. Check that `hasCompletedOnboarding` is `false` in user-data.ts
2. Use the debug menu (🎓 button) to manually trigger tutorials
3. Check console logs for tutorial service events

### If personality assessment doesn't work:
1. Make sure all 3 questions are answered in the personality step
2. Check that PersonalizationService is properly imported
3. Look for console logs showing personality assessment results

### If feature unlocks don't trigger:
1. Complete actual sessions (not just button taps)
2. Check that FeatureUnlockService is running
3. Use "Check Feature Unlocks" in debug menu

## Key Files Modified
- `app/services/tutorial-service.ts` - Core tutorial system
- `app/services/feature-unlock-service.ts` - Progressive unlocking
- `app/services/personalization-service.ts` - Personality assessment
- `app/view-models/onboarding-view-model.ts` - Enhanced onboarding
- `app/view-models/main-view-model.ts` - Tutorial integration
- `app/views/onboarding-page.xml` - Personality questions
- `app/main-page.xml` - Feature visibility, debug button

## Expected User Experience
1. **Engaging onboarding** with personality-driven recommendations
2. **Reduced cognitive load** through progressive feature unlocking
3. **Contextual help** that appears when needed
4. **Personalized interface** that adapts to user preferences
5. **Discovery-driven** feature exploration

The tutorial system creates a much more engaging and less overwhelming user experience by personalizing the journey and introducing features gradually based on user progress and preferences.
