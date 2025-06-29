/**
 * Celebration Component - Unplug PWA
 * Handles achievement celebrations and animations
 */

class CelebrationComponent {
    constructor() {
        this.celebrationModal = document.getElementById('celebration-modal');
        this.celebrationTitle = document.getElementById('celebration-title');
        this.celebrationMessage = document.getElementById('celebration-message');
        this.celebrationClose = document.getElementById('celebration-close');
        this.setupEventListeners();
    }

    static getInstance() {
        if (!CelebrationComponent.instance) {
            CelebrationComponent.instance = new CelebrationComponent();
        }
        return CelebrationComponent.instance;
    }

    setupEventListeners() {
        if (this.celebrationClose) {
            this.celebrationClose.addEventListener('click', () => {
                this.hideCelebration();
            });
        }

        // Auto-hide celebration after 5 seconds
        this.autoHideTimeout = null;
    }

    showAchievementCelebration(achievement) {
        if (!this.celebrationModal) {
            console.warn('Celebration modal not found');
            return;
        }

        // Update content
        if (this.celebrationTitle) {
            this.celebrationTitle.textContent = `${achievement.icon} ${achievement.name}`;
        }
        
        if (this.celebrationMessage) {
            this.celebrationMessage.textContent = achievement.description;
        }

        // Show celebration
        this.showCelebration();

        // Add confetti effect
        this.showConfetti();

        // Play celebration sound (if available)
        this.playCelebrationSound();
    }

    showLevelUpCelebration(newLevel, levelData) {
        if (!this.celebrationModal) {
            console.warn('Celebration modal not found');
            return;
        }

        // Update content
        if (this.celebrationTitle) {
            this.celebrationTitle.textContent = `🎉 Level Up!`;
        }
        
        if (this.celebrationMessage) {
            this.celebrationMessage.textContent = `You've reached Level ${newLevel}: ${levelData.title}!`;
        }

        // Show celebration
        this.showCelebration();

        // Add special level-up effects
        this.showLevelUpEffects();

        // Play level-up sound (if available)
        this.playLevelUpSound();
    }

    showGoalCelebration(goalType, message) {
        if (!this.celebrationModal) {
            console.warn('Celebration modal not found');
            return;
        }

        // Update content
        if (this.celebrationTitle) {
            this.celebrationTitle.textContent = `🎯 Goal Achieved!`;
        }
        
        if (this.celebrationMessage) {
            this.celebrationMessage.textContent = message || 'Congratulations on reaching your goal!';
        }

        // Show celebration
        this.showCelebration();

        // Add goal celebration effects
        this.showGoalEffects();
    }

    showCelebration() {
        if (!this.celebrationModal) return;

        // Clear any existing timeout
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
        }

        // Show modal with animation
        this.celebrationModal.style.display = 'flex';
        this.celebrationModal.classList.add('celebration-show');

        // Auto-hide after 5 seconds
        this.autoHideTimeout = setTimeout(() => {
            this.hideCelebration();
        }, 5000);

        // Add vibration if supported
        if ('vibrate' in navigator) {
            navigator.vibrate([200, 100, 200, 100, 200]);
        }
    }

    hideCelebration() {
        if (!this.celebrationModal) return;

        // Clear timeout
        if (this.autoHideTimeout) {
            clearTimeout(this.autoHideTimeout);
            this.autoHideTimeout = null;
        }

        // Hide with animation
        this.celebrationModal.classList.remove('celebration-show');
        
        setTimeout(() => {
            this.celebrationModal.style.display = 'none';
        }, 300);
    }

    showConfetti() {
        // Create confetti container
        const confettiContainer = document.createElement('div');
        confettiContainer.className = 'confetti-container';
        confettiContainer.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            z-index: 10000;
        `;

        document.body.appendChild(confettiContainer);

        // Create confetti pieces
        const colors = ['#ff6b6b', '#4ecdc4', '#45b7d1', '#96ceb4', '#ffeaa7', '#dda0dd'];
        const confettiCount = 50;

        for (let i = 0; i < confettiCount; i++) {
            const confetti = document.createElement('div');
            confetti.className = 'confetti-piece';
            confetti.style.cssText = `
                position: absolute;
                width: 10px;
                height: 10px;
                background-color: ${colors[Math.floor(Math.random() * colors.length)]};
                left: ${Math.random() * 100}%;
                animation: confetti-fall ${2 + Math.random() * 3}s linear forwards;
                transform: rotate(${Math.random() * 360}deg);
            `;

            confettiContainer.appendChild(confetti);
        }

        // Add confetti animation styles if not already present
        if (!document.getElementById('confetti-styles')) {
            const style = document.createElement('style');
            style.id = 'confetti-styles';
            style.textContent = `
                @keyframes confetti-fall {
                    0% {
                        transform: translateY(-100vh) rotate(0deg);
                        opacity: 1;
                    }
                    100% {
                        transform: translateY(100vh) rotate(720deg);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Remove confetti after animation
        setTimeout(() => {
            confettiContainer.remove();
        }, 5000);
    }

    showLevelUpEffects() {
        // Add special sparkle effect for level ups
        const sparkleContainer = document.createElement('div');
        sparkleContainer.className = 'sparkle-container';
        sparkleContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 10001;
        `;

        document.body.appendChild(sparkleContainer);

        // Create sparkles
        for (let i = 0; i < 20; i++) {
            const sparkle = document.createElement('div');
            sparkle.textContent = '✨';
            sparkle.style.cssText = `
                position: absolute;
                font-size: 20px;
                animation: sparkle ${1 + Math.random() * 2}s ease-out forwards;
                transform: translate(${(Math.random() - 0.5) * 200}px, ${(Math.random() - 0.5) * 200}px);
            `;

            sparkleContainer.appendChild(sparkle);
        }

        // Add sparkle animation
        if (!document.getElementById('sparkle-styles')) {
            const style = document.createElement('style');
            style.id = 'sparkle-styles';
            style.textContent = `
                @keyframes sparkle {
                    0% {
                        opacity: 0;
                        transform: scale(0) rotate(0deg);
                    }
                    50% {
                        opacity: 1;
                        transform: scale(1) rotate(180deg);
                    }
                    100% {
                        opacity: 0;
                        transform: scale(0) rotate(360deg);
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Remove sparkles after animation
        setTimeout(() => {
            sparkleContainer.remove();
        }, 3000);
    }

    showGoalEffects() {
        // Add target-like ripple effect for goals
        const rippleContainer = document.createElement('div');
        rippleContainer.className = 'ripple-container';
        rippleContainer.style.cssText = `
            position: fixed;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            pointer-events: none;
            z-index: 10001;
        `;

        document.body.appendChild(rippleContainer);

        // Create ripples
        for (let i = 0; i < 3; i++) {
            const ripple = document.createElement('div');
            ripple.style.cssText = `
                position: absolute;
                border: 3px solid #10B981;
                border-radius: 50%;
                animation: ripple ${1.5 + i * 0.3}s ease-out forwards;
                animation-delay: ${i * 0.2}s;
            `;

            rippleContainer.appendChild(ripple);
        }

        // Add ripple animation
        if (!document.getElementById('ripple-styles')) {
            const style = document.createElement('style');
            style.id = 'ripple-styles';
            style.textContent = `
                @keyframes ripple {
                    0% {
                        width: 0;
                        height: 0;
                        opacity: 1;
                    }
                    100% {
                        width: 300px;
                        height: 300px;
                        margin: -150px;
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        // Remove ripples after animation
        setTimeout(() => {
            rippleContainer.remove();
        }, 3000);
    }

    playCelebrationSound() {
        // Play a celebration sound if audio is enabled
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.3;
            audio.play().catch(() => {
                // Ignore audio play errors (user interaction required)
            });
        } catch (error) {
            // Ignore audio errors
        }
    }

    playLevelUpSound() {
        // Play a level-up sound if audio is enabled
        try {
            const audio = new Audio('data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIG2m98OScTgwOUarm7blmGgU7k9n1unEiBC13yO/eizEIHWq+8+OWT');
            audio.volume = 0.4;
            audio.play().catch(() => {
                // Ignore audio play errors
            });
        } catch (error) {
            // Ignore audio errors
        }
    }

    // Quick celebration for smaller achievements
    showQuickCelebration(message, emoji = '🎉') {
        const toast = document.createElement('div');
        toast.className = 'celebration-toast';
        toast.innerHTML = `<span class="toast-emoji">${emoji}</span> ${message}`;
        toast.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: linear-gradient(135deg, #10B981, #059669);
            color: white;
            padding: 12px 20px;
            border-radius: 8px;
            box-shadow: 0 4px 12px rgba(0,0,0,0.15);
            z-index: 10000;
            animation: toast-slide-in 0.3s ease-out forwards;
            font-weight: 500;
        `;

        // Add toast animation
        if (!document.getElementById('toast-styles')) {
            const style = document.createElement('style');
            style.id = 'toast-styles';
            style.textContent = `
                @keyframes toast-slide-in {
                    0% {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                    100% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                }
                @keyframes toast-slide-out {
                    0% {
                        transform: translateX(0);
                        opacity: 1;
                    }
                    100% {
                        transform: translateX(100%);
                        opacity: 0;
                    }
                }
            `;
            document.head.appendChild(style);
        }

        document.body.appendChild(toast);

        // Auto-remove after 3 seconds
        setTimeout(() => {
            toast.style.animation = 'toast-slide-out 0.3s ease-in forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }
}

// Create global instance
const celebrationComponent = CelebrationComponent.getInstance();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = CelebrationComponent;
}
