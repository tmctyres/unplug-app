import { Observable, Dialogs } from '@nativescript/core';
import { UserDataService, Achievement, AchievementCategory, AchievementRarity } from '../models/user-data';
import { TrackingService } from '../services/tracking-service';

export class AchievementsViewModel extends Observable {
  private userDataService: UserDataService;
  private trackingService: TrackingService;
  private _achievements: any[];
  private _filteredAchievements: any[];
  private _achievementChains: any[];
  private allAchievements: any[];

  // Filter states
  private selectedCategoryFilter: string = 'All';
  private selectedRarityFilter: string = 'All';
  private selectedStatusFilter: string = 'All';
  private currentSortBy: string = 'Rarity';

  constructor() {
    super();

    this.userDataService = UserDataService.getInstance();
    this.trackingService = TrackingService.getInstance();
    this._achievements = [];
    this._filteredAchievements = [];
    this._achievementChains = [];

    this.initializeFilters();
    this.loadAchievements();
    this.loadAchievementChains();
  }

  private initializeFilters(): void {
    this.set('selectedCategory', this.selectedCategoryFilter);
    this.set('selectedRarity', this.selectedRarityFilter);
    this.set('selectedStatus', this.selectedStatusFilter);
    this.set('sortBy', this.currentSortBy);
  }

  private loadAchievements(): void {
    const profile = this.userDataService.getUserProfile();

    this.allAchievements = profile.achievements.map(achievement => {
      const progressPercentage = this.userDataService.getAchievementProgress(achievement);
      const progressText = this.getProgressText(achievement, progressPercentage);

      return {
        ...achievement,
        progressPercentage,
        progressText,
        rarityColor: this.userDataService.getRarityColor(achievement.rarity),
        rarityName: this.userDataService.getRarityName(achievement.rarity),
        categoryName: this.userDataService.getCategoryName(achievement.category),
        chainInfo: this.getChainInfo(achievement),
        hasRequirements: achievement.requirements && achievement.requirements.length > 0,
        requirementsText: this.getRequirementsText(achievement),
        unlockedAt: achievement.unlockedAt ? new Date(achievement.unlockedAt) : null
      };
    });

    // Update the achievements array
    this._achievements.splice(0);
    this.allAchievements.forEach(achievement => {
      this._achievements.push(achievement);
    });

    this.updateFilteredAchievements();
    this.updateStats();
  }

  private loadAchievementChains(): void {
    const profile = this.userDataService.getUserProfile();

    const chainsWithProgress = profile.achievementChains.map(chain => {
      const chainAchievements = chain.achievements.map(id =>
        profile.achievements.find(a => a.id === id)
      ).filter(a => a !== undefined);

      const completedCount = chainAchievements.filter(a => a.unlocked).length;
      const totalCount = chainAchievements.length;
      const progressPercentage = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

      return {
        ...chain,
        progress: completedCount,
        total: totalCount,
        progressPercentage,
        isCompleted: completedCount === totalCount
      };
    });

    this._achievementChains.splice(0);
    chainsWithProgress.forEach(chain => {
      this._achievementChains.push(chain);
    });

    this.set('hasChains', chainsWithProgress.length > 0);
  }

  private updateFilteredAchievements(): void {
    let filtered = [...this.allAchievements];

    // Apply category filter
    if (this.selectedCategoryFilter !== 'All') {
      filtered = filtered.filter(a =>
        this.userDataService.getCategoryName(a.category) === this.selectedCategoryFilter
      );
    }

    // Apply rarity filter
    if (this.selectedRarityFilter !== 'All') {
      filtered = filtered.filter(a =>
        this.userDataService.getRarityName(a.rarity) === this.selectedRarityFilter
      );
    }

    // Apply status filter
    if (this.selectedStatusFilter === 'Unlocked') {
      filtered = filtered.filter(a => a.unlocked);
    } else if (this.selectedStatusFilter === 'Locked') {
      filtered = filtered.filter(a => !a.unlocked);
    }

    // Apply sorting
    filtered = this.sortAchievements(filtered);

    this._filteredAchievements.splice(0);
    filtered.forEach(achievement => {
      this._filteredAchievements.push(achievement);
    });
  }

  private sortAchievements(achievements: any[]): any[] {
    switch (this.currentSortBy) {
      case 'Rarity':
        return achievements.sort((a, b) => {
          const rarityOrder = { 'Legendary': 4, 'Epic': 3, 'Rare': 2, 'Common': 1 };
          return rarityOrder[b.rarityName] - rarityOrder[a.rarityName];
        });
      case 'Progress':
        return achievements.sort((a, b) => {
          if (a.unlocked && !b.unlocked) return -1;
          if (!a.unlocked && b.unlocked) return 1;
          return b.progressPercentage - a.progressPercentage;
        });
      case 'XP Reward':
        return achievements.sort((a, b) => b.xpReward - a.xpReward);
      case 'Category':
        return achievements.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
      default:
        return achievements;
    }
  }

  private updateStats(): void {
    const profile = this.userDataService.getUserProfile();
    const unlockedCount = profile.achievements.filter(a => a.unlocked).length;
    const totalCount = profile.achievements.length;
    const completionPercentage = Math.round((unlockedCount / totalCount) * 100);

    // Rarity breakdown
    const commonCount = this.userDataService.getAchievementsByRarity(AchievementRarity.COMMON).filter(a => a.unlocked).length;
    const rareCount = this.userDataService.getAchievementsByRarity(AchievementRarity.RARE).filter(a => a.unlocked).length;
    const epicCount = this.userDataService.getAchievementsByRarity(AchievementRarity.EPIC).filter(a => a.unlocked).length;
    const legendaryCount = this.userDataService.getAchievementsByRarity(AchievementRarity.LEGENDARY).filter(a => a.unlocked).length;

    this.set('unlockedCount', unlockedCount);
    this.set('totalCount', totalCount);
    this.set('completionPercentage', completionPercentage);
    this.set('commonCount', commonCount);
    this.set('rareCount', rareCount);
    this.set('epicCount', epicCount);
    this.set('legendaryCount', legendaryCount);
  }

  private getProgressText(achievement: Achievement, progressPercentage: number): string {
    if (achievement.unlocked) return 'Completed!';

    switch (achievement.category) {
      case AchievementCategory.TIME_BASED:
        if (achievement.targetMinutes <= 1440) {
          const todayStats = this.userDataService.getTodayStats();
          const progress = todayStats ? todayStats.offlineMinutes : 0;
          return `${this.trackingService.formatDuration(progress)} / ${this.trackingService.formatDuration(achievement.targetMinutes)}`;
        } else {
          const totalMinutes = this.userDataService.getUserProfile().totalOfflineHours * 60;
          return `${this.trackingService.formatDuration(totalMinutes)} / ${this.trackingService.formatDuration(achievement.targetMinutes)}`;
        }
      case AchievementCategory.STREAK:
        const targetDays = achievement.id === 'three_day_streak' ? 3 :
                          achievement.id === 'week_warrior' ? 7 :
                          achievement.id === 'month_master' ? 30 :
                          achievement.id === 'century_sage' ? 100 : 1;
        const currentStreak = this.userDataService.getUserProfile().currentStreak;
        return `${currentStreak} / ${targetDays} days`;
      case AchievementCategory.MILESTONE:
        if (achievement.targetMinutes === -1) {
          const targetSessions = achievement.id === 'session_master' ? 10 :
                                 achievement.id === 'session_veteran' ? 50 : 1;
          const totalSessions = this.userDataService.getUserProfile().totalSessions;
          return `${totalSessions} / ${targetSessions} sessions`;
        }
        break;
      default:
        return `${Math.round(progressPercentage)}% complete`;
    }
    return `${Math.round(progressPercentage)}% complete`;
  }

  private getChainInfo(achievement: Achievement): string {
    if (!achievement.chainId) return '';

    const profile = this.userDataService.getUserProfile();
    const chain = profile.achievementChains.find(c => c.id === achievement.chainId);
    if (!chain) return '';

    return `${chain.name} (${achievement.chainOrder}/${chain.achievements.length})`;
  }

  private getRequirementsText(achievement: Achievement): string {
    if (!achievement.requirements) return '';

    return achievement.requirements.map(req => {
      switch (req.type) {
        case 'time_of_day':
          return `Complete during ${req.value}`;
        case 'day_of_week':
          return `Complete on ${Array.isArray(req.value) ? req.value.join(', ') : req.value}`;
        case 'level':
          return `Reach level ${req.value}`;
        default:
          return `${req.type}: ${req.value}`;
      }
    }).join(', ');
  }

  // Filter and sort event handlers
  onCategoryFilter(): void {
    const categories = ['All', 'Time-based', 'Streak', 'Milestone', 'Level', 'Time of Day', 'Weekend', 'Combo', 'Seasonal'];

    Dialogs.action({
      title: 'Filter by Category',
      cancelButtonText: 'Cancel',
      actions: categories
    }).then(result => {
      if (result !== 'Cancel') {
        this.selectedCategoryFilter = result;
        this.set('selectedCategory', result);
        this.updateFilteredAchievements();
      }
    });
  }

  onRarityFilter(): void {
    const rarities = ['All', 'Common', 'Rare', 'Epic', 'Legendary'];

    Dialogs.action({
      title: 'Filter by Rarity',
      cancelButtonText: 'Cancel',
      actions: rarities
    }).then(result => {
      if (result !== 'Cancel') {
        this.selectedRarityFilter = result;
        this.set('selectedRarity', result);
        this.updateFilteredAchievements();
      }
    });
  }

  onStatusFilter(): void {
    const statuses = ['All', 'Unlocked', 'Locked'];

    Dialogs.action({
      title: 'Filter by Status',
      cancelButtonText: 'Cancel',
      actions: statuses
    }).then(result => {
      if (result !== 'Cancel') {
        this.selectedStatusFilter = result;
        this.set('selectedStatus', result);
        this.updateFilteredAchievements();
      }
    });
  }

  onSort(): void {
    const sortOptions = ['Rarity', 'Progress', 'XP Reward', 'Category'];

    Dialogs.action({
      title: 'Sort by',
      cancelButtonText: 'Cancel',
      actions: sortOptions
    }).then(result => {
      if (result !== 'Cancel') {
        this.currentSortBy = result;
        this.set('sortBy', result);
        this.updateFilteredAchievements();
      }
    });
  }

  onShareAchievement(achievement: Achievement): void {
    if (!achievement.unlocked) {
      Dialogs.alert({
        title: 'Cannot Share',
        message: 'You can only share achievements that you have unlocked.',
        okButtonText: 'OK'
      });
      return;
    }

    const { Frame } = require('@nativescript/core');
    Frame.topmost().navigate({
      moduleName: 'views/achievement-sharing-page',
      context: { achievement }
    });
  }

  onAchievementTap(achievement: Achievement): void {
    // Show achievement details or sharing options
    if (achievement.unlocked) {
      this.showAchievementActions(achievement);
    } else {
      this.showAchievementDetails(achievement);
    }
  }

  private showAchievementActions(achievement: Achievement): void {
    const actions = ['View Details', 'Share Achievement', 'Cancel'];

    Dialogs.action({
      title: achievement.title,
      actions: actions,
      cancelButtonText: 'Cancel'
    }).then(result => {
      switch (result) {
        case 'View Details':
          this.showAchievementDetails(achievement);
          break;
        case 'Share Achievement':
          this.onShareAchievement(achievement);
          break;
      }
    });
  }

  private showAchievementDetails(achievement: Achievement): void {
    const progressPercentage = this.userDataService.getAchievementProgress(achievement);
    const progressText = this.getProgressText(achievement, progressPercentage);
    const message = `${achievement.description}\n\nProgress: ${progressText}\nXP Reward: ${achievement.xpReward}`;

    Dialogs.alert({
      title: achievement.title,
      message: message,
      okButtonText: 'OK'
    });
  }

  get achievements(): any[] {
    return this._achievements;
  }

  get filteredAchievements(): any[] {
    return this._filteredAchievements;
  }

  get achievementChains(): any[] {
    return this._achievementChains;
  }
}