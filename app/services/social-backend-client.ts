/**
 * Social Backend Client
 * Handles communication with the real social backend API
 */

import { Http, ApplicationSettings } from '@nativescript/core';
import { SecurityUtils } from '../utils/security-utils';

export interface BackendConfig {
  baseUrl: string;
  timeout: number;
  retryAttempts: number;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

export interface User {
  id: string;
  username: string;
  email: string;
  displayName: string;
  avatarUrl?: string;
  bio?: string;
  isVerified: boolean;
  isPublic: boolean;
  createdAt: string;
  updatedAt: string;
  lastActive: string;
}

export interface LeaderboardEntry {
  id: string;
  leaderboardId: string;
  userId: string;
  username: string;
  displayName: string;
  avatarUrl?: string;
  value: number;
  rank: number;
  isAnonymous: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface SharedAchievement {
  id: string;
  userId: string;
  achievementType: string;
  title: string;
  description: string;
  icon: string;
  value?: number;
  unit?: string;
  unlockedAt: string;
  isShared: boolean;
  shareCount: number;
  likesCount: number;
  createdAt: string;
  user: {
    username: string;
    displayName: string;
    avatarUrl?: string;
    isVerified: boolean;
  };
  isLikedByUser?: boolean;
}

export class SocialBackendClient {
  private static instance: SocialBackendClient;
  private config: BackendConfig;
  private accessToken: string | null = null;
  private refreshToken: string | null = null;

  private constructor() {
    this.config = {
      baseUrl: process.env.BACKEND_URL || 'http://localhost:3000',
      timeout: 30000,
      retryAttempts: 3
    };
    
    this.loadStoredTokens();
  }

  static getInstance(): SocialBackendClient {
    if (!SocialBackendClient.instance) {
      SocialBackendClient.instance = new SocialBackendClient();
    }
    return SocialBackendClient.instance;
  }

  /**
   * Update backend configuration
   */
  updateConfig(config: Partial<BackendConfig>): void {
    this.config = { ...this.config, ...config };
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.accessToken;
  }

  /**
   * Register new user
   */
  async register(userData: {
    username: string;
    email: string;
    password: string;
    displayName: string;
  }): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    try {
      const response = await this.makeRequest('/api/auth/register', 'POST', userData);

      if (response.success && response.data) {
        const typedData = response.data as { user: User; tokens: AuthTokens };
        this.setTokens(typedData.tokens);
        return response as ApiResponse<{ user: User; tokens: AuthTokens }>;
      }

      return response as ApiResponse<{ user: User; tokens: AuthTokens }>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Login user
   */
  async login(credentials: {
    email: string;
    password: string;
  }): Promise<ApiResponse<{ user: User; tokens: AuthTokens }>> {
    try {
      const response = await this.makeRequest('/api/auth/login', 'POST', credentials);

      if (response.success && response.data) {
        const typedData = response.data as { user: User; tokens: AuthTokens };
        this.setTokens(typedData.tokens);
        return response as ApiResponse<{ user: User; tokens: AuthTokens }>;
      }

      return response as ApiResponse<{ user: User; tokens: AuthTokens }>;
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Logout user
   */
  async logout(): Promise<ApiResponse<void>> {
    try {
      if (this.refreshToken) {
        await this.makeRequest('/api/auth/logout', 'POST', {
          refreshToken: this.refreshToken
        });
      }
      
      this.clearTokens();
      return { success: true };
    } catch (error) {
      this.clearTokens();
      return { success: true }; // Always succeed logout
    }
  }

  /**
   * Get current user profile
   */
  async getCurrentUser(): Promise<ApiResponse<User>> {
    try {
      return await this.makeRequest('/api/auth/me', 'GET');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get leaderboards
   */
  async getLeaderboards(): Promise<ApiResponse<any[]>> {
    try {
      return await this.makeRequest('/api/leaderboards', 'GET');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get leaderboard entries
   */
  async getLeaderboardEntries(leaderboardId: string, limit: number = 100, offset: number = 0): Promise<ApiResponse<LeaderboardEntry[]>> {
    try {
      return await this.makeRequest(`/api/leaderboards/${leaderboardId}/entries?limit=${limit}&offset=${offset}`, 'GET');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Submit score to leaderboard
   */
  async submitScore(leaderboardId: string, value: number, isAnonymous: boolean = false): Promise<ApiResponse<LeaderboardEntry>> {
    try {
      return await this.makeRequest(`/api/leaderboards/${leaderboardId}/entries`, 'POST', {
        value,
        isAnonymous
      });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get user's ranks across leaderboards
   */
  async getUserRanks(userId: string): Promise<ApiResponse<Array<{ leaderboardId: string; rank: number; value: number }>>> {
    try {
      return await this.makeRequest(`/api/leaderboards/user/${userId}/ranks`, 'GET');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Submit achievement
   */
  async submitAchievement(achievementData: {
    achievementType: string;
    title: string;
    description: string;
    icon: string;
    value?: number;
    unit?: string;
    unlockedAt: string;
  }): Promise<ApiResponse<any>> {
    try {
      return await this.makeRequest('/api/achievements', 'POST', achievementData);
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Share achievement
   */
  async shareAchievement(achievementId: string): Promise<ApiResponse<SharedAchievement>> {
    try {
      return await this.makeRequest(`/api/achievements/${achievementId}/share`, 'POST');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get shared achievements feed
   */
  async getSharedAchievements(limit: number = 20, offset: number = 0): Promise<ApiResponse<SharedAchievement[]>> {
    try {
      return await this.makeRequest(`/api/achievements/shared?limit=${limit}&offset=${offset}`, 'GET');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Like achievement
   */
  async likeAchievement(achievementId: string): Promise<ApiResponse<{ liked: boolean; likesCount: number }>> {
    try {
      return await this.makeRequest(`/api/achievements/${achievementId}/like`, 'POST');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get user achievements
   */
  async getUserAchievements(): Promise<ApiResponse<any[]>> {
    try {
      return await this.makeRequest('/api/achievements', 'GET');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get friends list
   */
  async getFriends(): Promise<ApiResponse<any[]>> {
    try {
      return await this.makeRequest('/api/social/friends', 'GET');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Send friend request
   */
  async sendFriendRequest(userId: string): Promise<ApiResponse<any>> {
    try {
      return await this.makeRequest('/api/social/friends/request', 'POST', { userId });
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Accept friend request
   */
  async acceptFriendRequest(friendshipId: string): Promise<ApiResponse<any>> {
    try {
      return await this.makeRequest(`/api/social/friends/${friendshipId}/accept`, 'PUT');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Get notifications
   */
  async getNotifications(): Promise<ApiResponse<any[]>> {
    try {
      return await this.makeRequest('/api/notifications', 'GET');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Mark notification as read
   */
  async markNotificationRead(notificationId: string): Promise<ApiResponse<void>> {
    try {
      return await this.makeRequest(`/api/notifications/${notificationId}/read`, 'PUT');
    } catch (error) {
      return this.handleError(error);
    }
  }

  /**
   * Make HTTP request with authentication and error handling
   */
  private async makeRequest<T>(endpoint: string, method: string, data?: any): Promise<ApiResponse<T>> {
    const url = `${this.config.baseUrl}${endpoint}`;
    
    // Rate limiting
    if (!SecurityUtils.rateLimiter.isAllowed('api_request', 100, 60000)) {
      throw new Error('Too many API requests. Please wait a moment.');
    }

    const headers: any = {
      'Content-Type': 'application/json',
      'User-Agent': 'Unplug-App/1.0'
    };

    // Add authentication header if available
    if (this.accessToken) {
      headers['Authorization'] = `Bearer ${this.accessToken}`;
    }

    try {
      const response = await Http.request({
        url,
        method,
        headers,
        content: data ? JSON.stringify(data) : undefined,
        timeout: this.config.timeout
      });

      const responseData = response.content?.toJSON();

      if (response.statusCode >= 200 && response.statusCode < 300) {
        return {
          success: true,
          data: responseData?.data || responseData,
          message: responseData?.message
        };
      } else if (response.statusCode === 401) {
        // Try to refresh token
        const refreshed = await this.refreshAccessToken();
        if (refreshed) {
          // Retry the request with new token
          headers['Authorization'] = `Bearer ${this.accessToken}`;
          const retryResponse = await Http.request({
            url,
            method,
            headers,
            content: data ? JSON.stringify(data) : undefined,
            timeout: this.config.timeout
          });

          const retryData = retryResponse.content?.toJSON();
          if (retryResponse.statusCode >= 200 && retryResponse.statusCode < 300) {
            return {
              success: true,
              data: retryData?.data || retryData,
              message: retryData?.message
            };
          }
        }

        // If refresh failed, clear tokens and return error
        this.clearTokens();
        return {
          success: false,
          error: 'Authentication failed. Please login again.'
        };
      } else {
        return {
          success: false,
          error: responseData?.error || responseData?.message || `HTTP ${response.statusCode}`
        };
      }
    } catch (error) {
      console.error('API request failed:', error);
      return {
        success: false,
        error: error.message || 'Network error'
      };
    }
  }

  /**
   * Refresh access token
   */
  private async refreshAccessToken(): Promise<boolean> {
    if (!this.refreshToken) return false;

    try {
      const response = await Http.request({
        url: `${this.config.baseUrl}/api/auth/refresh`,
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        content: JSON.stringify({
          refreshToken: this.refreshToken
        }),
        timeout: this.config.timeout
      });

      if (response.statusCode === 200) {
        const data = response.content?.toJSON();
        if (data?.accessToken) {
          this.setTokens({
            accessToken: data.accessToken,
            refreshToken: data.refreshToken || this.refreshToken,
            expiresIn: data.expiresIn
          });
          return true;
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
    }

    return false;
  }

  /**
   * Set authentication tokens
   */
  private setTokens(tokens: AuthTokens): void {
    this.accessToken = tokens.accessToken;
    this.refreshToken = tokens.refreshToken;
    
    // Store securely
    SecurityUtils.secureStore.setItem('access_token', tokens.accessToken);
    SecurityUtils.secureStore.setItem('refresh_token', tokens.refreshToken);
    SecurityUtils.secureStore.setItem('token_expires_at', (Date.now() + tokens.expiresIn * 1000).toString());
  }

  /**
   * Load stored tokens
   */
  private loadStoredTokens(): void {
    try {
      const accessToken = SecurityUtils.secureStore.getItem('access_token');
      const refreshToken = SecurityUtils.secureStore.getItem('refresh_token');
      const expiresAt = SecurityUtils.secureStore.getItem('token_expires_at');

      if (accessToken && refreshToken) {
        // Check if token is still valid
        if (expiresAt && Date.now() < parseInt(expiresAt)) {
          this.accessToken = accessToken;
          this.refreshToken = refreshToken;
        } else {
          // Token expired, clear it
          this.clearTokens();
        }
      }
    } catch (error) {
      console.error('Failed to load stored tokens:', error);
      this.clearTokens();
    }
  }

  /**
   * Clear authentication tokens
   */
  private clearTokens(): void {
    this.accessToken = null;
    this.refreshToken = null;
    
    SecurityUtils.secureStore.removeItem('access_token');
    SecurityUtils.secureStore.removeItem('refresh_token');
    SecurityUtils.secureStore.removeItem('token_expires_at');
  }

  /**
   * Handle API errors
   */
  private handleError(error: any): ApiResponse<any> {
    console.error('API Error:', error);
    return {
      success: false,
      error: error.message || 'An unexpected error occurred'
    };
  }

  /**
   * Test backend connectivity
   */
  async testConnection(): Promise<boolean> {
    try {
      const response = await Http.request({
        url: `${this.config.baseUrl}/health`,
        method: 'GET',
        timeout: 10000
      });
      
      return response.statusCode === 200;
    } catch (error) {
      console.error('Backend connection test failed:', error);
      return false;
    }
  }
}
