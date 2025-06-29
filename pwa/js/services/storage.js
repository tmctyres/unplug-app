/**
 * Storage Service - Unplug PWA
 * Handles local storage operations with fallback support
 */

class StorageService {
    constructor() {
        console.log('StorageService constructor called');
        this.isLocalStorageAvailable = this.checkLocalStorageAvailability();
        this.fallbackStorage = new Map();
        console.log('StorageService initialized, localStorage available:', this.isLocalStorageAvailable);
    }

    static getInstance() {
        if (!StorageService.instance) {
            StorageService.instance = new StorageService();
        }
        return StorageService.instance;
    }

    checkLocalStorageAvailability() {
        try {
            const test = '__storage_test__';
            localStorage.setItem(test, test);
            localStorage.removeItem(test);
            return true;
        } catch (e) {
            console.warn('localStorage not available, using fallback storage');
            return false;
        }
    }

    setItem(key, value) {
        try {
            const serializedValue = JSON.stringify(value);
            
            if (this.isLocalStorageAvailable) {
                localStorage.setItem(key, serializedValue);
            } else {
                this.fallbackStorage.set(key, serializedValue);
            }
            
            return true;
        } catch (error) {
            console.error('Error storing data:', error);
            return false;
        }
    }

    getItem(key, defaultValue = null) {
        try {
            let value;
            
            if (this.isLocalStorageAvailable) {
                value = localStorage.getItem(key);
            } else {
                value = this.fallbackStorage.get(key);
            }
            
            if (value === null || value === undefined) {
                return defaultValue;
            }
            
            return JSON.parse(value);
        } catch (error) {
            console.error('Error retrieving data:', error);
            return defaultValue;
        }
    }

    removeItem(key) {
        try {
            if (this.isLocalStorageAvailable) {
                localStorage.removeItem(key);
            } else {
                this.fallbackStorage.delete(key);
            }
            return true;
        } catch (error) {
            console.error('Error removing data:', error);
            return false;
        }
    }

    clear() {
        try {
            if (this.isLocalStorageAvailable) {
                localStorage.clear();
            } else {
                this.fallbackStorage.clear();
            }
            return true;
        } catch (error) {
            console.error('Error clearing storage:', error);
            return false;
        }
    }

    getAllKeys() {
        try {
            if (this.isLocalStorageAvailable) {
                return Object.keys(localStorage);
            } else {
                return Array.from(this.fallbackStorage.keys());
            }
        } catch (error) {
            console.error('Error getting keys:', error);
            return [];
        }
    }

    getStorageInfo() {
        return {
            isLocalStorageAvailable: this.isLocalStorageAvailable,
            storageType: this.isLocalStorageAvailable ? 'localStorage' : 'fallback',
            itemCount: this.getAllKeys().length
        };
    }
}

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = StorageService;
}

// Make available globally for browser use
window.StorageService = StorageService;
