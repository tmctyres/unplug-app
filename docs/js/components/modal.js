/**
 * Modal Component - Unplug PWA
 * Handles modal dialogs and overlays
 */

class ModalComponent {
    constructor() {
        this.activeModal = null;
        this.overlay = document.getElementById('modal-overlay');
        this.setupEventListeners();
    }

    static getInstance() {
        if (!ModalComponent.instance) {
            ModalComponent.instance = new ModalComponent();
        }
        return ModalComponent.instance;
    }

    setupEventListeners() {
        // Close modal when clicking overlay
        if (this.overlay) {
            this.overlay.addEventListener('click', (e) => {
                if (e.target === this.overlay) {
                    this.closeModal();
                }
            });
        }

        // Close modal with Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.activeModal) {
                this.closeModal();
            }
        });
    }

    showModal(modalId) {
        const modal = document.getElementById(modalId);
        if (!modal) {
            console.error(`Modal with id "${modalId}" not found`);
            return false;
        }

        // Close any existing modal first
        this.closeModal();

        // Show overlay
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }

        // Show modal
        modal.style.display = 'flex';
        this.activeModal = modal;

        // Add animation class if available
        modal.classList.add('modal-show');

        // Focus management for accessibility
        this.trapFocus(modal);

        return true;
    }

    closeModal() {
        if (!this.activeModal) return;

        // Hide modal
        this.activeModal.style.display = 'none';
        this.activeModal.classList.remove('modal-show');
        this.activeModal = null;

        // Hide overlay
        if (this.overlay) {
            this.overlay.style.display = 'none';
        }

        // Restore focus to previously focused element
        this.restoreFocus();
    }

    showConfirmDialog(title, message, onConfirm, onCancel) {
        const modalHtml = `
            <div id="confirm-modal" class="modal confirm-modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="modalComponent.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button id="confirm-cancel" class="secondary-btn">Cancel</button>
                        <button id="confirm-ok" class="primary-btn">Confirm</button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing confirm modal if any
        const existingModal = document.getElementById('confirm-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('confirm-modal');
        const cancelBtn = document.getElementById('confirm-cancel');
        const confirmBtn = document.getElementById('confirm-ok');

        // Set up event listeners
        cancelBtn.addEventListener('click', () => {
            this.closeModal();
            if (onCancel) onCancel();
        });

        confirmBtn.addEventListener('click', () => {
            this.closeModal();
            if (onConfirm) onConfirm();
        });

        // Show the modal
        this.activeModal = modal;
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }

        // Focus the confirm button
        confirmBtn.focus();
    }

    showAlert(title, message, onClose) {
        const modalHtml = `
            <div id="alert-modal" class="modal alert-modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="modalComponent.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                    </div>
                    <div class="modal-footer">
                        <button id="alert-ok" class="primary-btn">OK</button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing alert modal if any
        const existingModal = document.getElementById('alert-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('alert-modal');
        const okBtn = document.getElementById('alert-ok');

        // Set up event listener
        okBtn.addEventListener('click', () => {
            this.closeModal();
            if (onClose) onClose();
        });

        // Show the modal
        this.activeModal = modal;
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }

        // Focus the OK button
        okBtn.focus();
    }

    showInputDialog(title, message, placeholder, onConfirm, onCancel) {
        const modalHtml = `
            <div id="input-modal" class="modal input-modal" style="display: flex;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3>${title}</h3>
                        <button class="modal-close" onclick="modalComponent.closeModal()">&times;</button>
                    </div>
                    <div class="modal-body">
                        <p>${message}</p>
                        <input type="text" id="input-field" class="modal-input" placeholder="${placeholder}" />
                    </div>
                    <div class="modal-footer">
                        <button id="input-cancel" class="secondary-btn">Cancel</button>
                        <button id="input-ok" class="primary-btn">OK</button>
                    </div>
                </div>
            </div>
        `;

        // Remove existing input modal if any
        const existingModal = document.getElementById('input-modal');
        if (existingModal) {
            existingModal.remove();
        }

        // Add modal to body
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        const modal = document.getElementById('input-modal');
        const inputField = document.getElementById('input-field');
        const cancelBtn = document.getElementById('input-cancel');
        const okBtn = document.getElementById('input-ok');

        // Set up event listeners
        cancelBtn.addEventListener('click', () => {
            this.closeModal();
            if (onCancel) onCancel();
        });

        okBtn.addEventListener('click', () => {
            const value = inputField.value.trim();
            this.closeModal();
            if (onConfirm) onConfirm(value);
        });

        // Handle Enter key
        inputField.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                okBtn.click();
            }
        });

        // Show the modal
        this.activeModal = modal;
        if (this.overlay) {
            this.overlay.style.display = 'flex';
        }

        // Focus the input field
        inputField.focus();
    }

    trapFocus(modal) {
        const focusableElements = modal.querySelectorAll(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        
        if (focusableElements.length === 0) return;

        const firstElement = focusableElements[0];
        const lastElement = focusableElements[focusableElements.length - 1];

        // Store the previously focused element
        this.previouslyFocusedElement = document.activeElement;

        // Focus the first element
        firstElement.focus();

        // Handle Tab key navigation
        modal.addEventListener('keydown', (e) => {
            if (e.key === 'Tab') {
                if (e.shiftKey) {
                    // Shift + Tab
                    if (document.activeElement === firstElement) {
                        e.preventDefault();
                        lastElement.focus();
                    }
                } else {
                    // Tab
                    if (document.activeElement === lastElement) {
                        e.preventDefault();
                        firstElement.focus();
                    }
                }
            }
        });
    }

    restoreFocus() {
        if (this.previouslyFocusedElement) {
            this.previouslyFocusedElement.focus();
            this.previouslyFocusedElement = null;
        }
    }

    isModalOpen() {
        return this.activeModal !== null;
    }

    getActiveModal() {
        return this.activeModal;
    }
}

// Create global instance
const modalComponent = ModalComponent.getInstance();

// Export for use in other modules
if (typeof module !== 'undefined' && module.exports) {
    module.exports = ModalComponent;
}
