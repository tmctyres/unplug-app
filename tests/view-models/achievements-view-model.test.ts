import { AchievementsViewModel } from '../../app/view-models/achievements-view-model';
import { UserDataService, AchievementCategory, AchievementRarity } from '../../app/models/user-data';
import { TrackingService } from '../../app/services/tracking-service';

// Mock the dependencies
jest.mock('../../app/models/user-data');
jest.mock('../../app/services/tracking-service');

describe('AchievementsViewModel', () => {
  let viewModel: AchievementsViewModel;
  let mockUserDataService: jest.Mocked<UserDataService>;
  let mockTrackingService: jest.Mocked<TrackingService>;

  beforeEach(() => {
    // Create mock instances
    mockUserDataService = {
      getUserProfile: jest.fn(),
      getTodayStats: jest.fn(),
      getAchievementProgress: jest.fn(),
      getRarityColor: jest.fn(),
      getRarityName: jest.fn(),
      getCategoryName: jest.fn(),
      getAchievementsByCategory: jest.fn(),
      getAchievementsByRarity: jest.fn(),
      getInstance: jest.fn()
    } as any;

    mockTrackingService = {
      getCurrentSession: jest.fn(),
      formatDuration: jest.fn(),
      getInstance: jest.fn()
    } as any;

    // Mock the getInstance methods
    (UserDataService.getInstance as jest.Mock).mockReturnValue(mockUserDataService);
    (TrackingService.getInstance as jest.Mock).mockReturnValue(mockTrackingService);

    // Setup default mock returns
    mockUserDataService.getUserProfile.mockReturnValue({
      totalXP: 100,
      level: 2,
      currentStreak: 1,
      longestStreak: 3,
      totalOfflineHours: 2,
      joinDate: new Date(),
      userTitle: 'Screen Breaker',
      userBadge: '📱',
      xpMultiplier: 1.0,
      totalSessions: 5,
      weekendSessions: 1,
      morningMeditations: 2,
      eveningWinddowns: 1,
      dailyStats: [],
      sessionNotes: [],
      sessionGoals: [],
      achievements: [
        {
          id: 'test_achievement',
          title: 'Test Achievement',
          description: 'A test achievement',
          icon: '🎯',
          xpReward: 100,
          targetMinutes: 60,
          unlocked: false,
          category: AchievementCategory.TIME_BASED,
          rarity: AchievementRarity.COMMON,
          chainId: 'test_chain',
          chainOrder: 1
        },
        {
          id: 'rare_achievement',
          title: 'Rare Achievement',
          description: 'A rare achievement',
          icon: '💎',
          xpReward: 500,
          targetMinutes: 180,
          unlocked: true,
          category: AchievementCategory.STREAK,
          rarity: AchievementRarity.RARE,
          unlockedAt: new Date()
        }
      ],
      achievementChains: [
        {
          id: 'test_chain',
          name: 'Test Chain',
          description: 'A test achievement chain',
          icon: '🔗',
          achievements: ['test_achievement'],
          rewards: { xp: 1000 }
        }
      ],
      settings: {
        notificationsEnabled: true,
        darkMode: false,
        dailyGoalMinutes: 180,
        reminderInterval: 60,
        isPremium: false,
        subscriptionType: 'free',
        showAds: true,
        backupEnabled: false,
        exportFormat: 'json',
        minimumSessionMinutes: 5,
        hasCompletedOnboarding: true,
        preferredTheme: 'light'
      }
    });

    mockUserDataService.getTodayStats.mockReturnValue({
      date: new Date().toDateString(),
      offlineMinutes: 30,
      xpEarned: 30,
      achievementsUnlocked: []
    });

    mockTrackingService.getCurrentSession.mockReturnValue({
      startTime: new Date(),
      isActive: false,
      duration: 0
    });

    mockTrackingService.formatDuration.mockImplementation((minutes) => `${minutes}m`);

    // Mock helper methods
    mockUserDataService.getAchievementProgress.mockReturnValue(50);
    mockUserDataService.getRarityColor.mockReturnValue('#6b7280');
    mockUserDataService.getRarityName.mockReturnValue('Common');
    mockUserDataService.getCategoryName.mockReturnValue('Time-based');
    mockUserDataService.getAchievementsByCategory.mockReturnValue([]);
    mockUserDataService.getAchievementsByRarity.mockReturnValue([]);

    viewModel = new AchievementsViewModel();
  });

  it('should initialize with enhanced achievements data', () => {
    expect(viewModel.filteredAchievements).toBeDefined();
    expect(viewModel.achievementChains).toBeDefined();
    expect(mockUserDataService.getUserProfile).toHaveBeenCalled();
  });

  it('should calculate enhanced achievement properties', () => {
    const achievements = viewModel.filteredAchievements;
    expect(achievements.length).toBe(2);
    
    const achievement = achievements[0];
    expect(achievement.rarityColor).toBeDefined();
    expect(achievement.rarityName).toBeDefined();
    expect(achievement.categoryName).toBeDefined();
    expect(achievement.chainInfo).toBeDefined();
  });

  it('should show correct enhanced completion stats', () => {
    // Access properties directly since Observable.get() might not be available in test environment
    expect((viewModel as any)._data?.unlockedCount || (viewModel as any).unlockedCount).toBe(1); // One unlocked achievement
    expect((viewModel as any)._data?.totalCount || (viewModel as any).totalCount).toBe(2); // Total achievements in test data
    expect((viewModel as any)._data?.completionPercentage || (viewModel as any).completionPercentage).toBeGreaterThanOrEqual(0);
    expect((viewModel as any)._data?.commonCount || (viewModel as any).commonCount).toBeDefined();
    expect((viewModel as any)._data?.rareCount || (viewModel as any).rareCount).toBeDefined();
    expect((viewModel as any)._data?.epicCount || (viewModel as any).epicCount).toBeDefined();
    expect((viewModel as any)._data?.legendaryCount || (viewModel as any).legendaryCount).toBeDefined();
  });

  it('should handle achievement chains correctly', () => {
    const chains = viewModel.achievementChains;
    expect(chains.length).toBe(1);
    
    const chain = chains[0];
    expect(chain.progress).toBeDefined();
    expect(chain.total).toBeDefined();
    expect(chain.progressPercentage).toBeDefined();
  });

  it('should handle chain info generation', () => {
    const achievements = viewModel.filteredAchievements;
    const chainedAchievement = achievements[0];
    
    expect(chainedAchievement.chainInfo).toContain('Test Chain');
    expect(chainedAchievement.chainInfo).toContain('1/1');
  });
});
