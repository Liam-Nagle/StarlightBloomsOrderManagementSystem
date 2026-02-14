/**
 * Modal Component Utilities
 * Handles opening, closing, and managing modal dialogs
 */

class Modal {
    constructor(modalId) {
        this.modal = document.getElementById(modalId);
        if (!this.modal) {
            console.error(`Modal with id '${modalId}' not found`);
            return;
        }

        this.setupCloseHandlers();
    }

    setupCloseHandlers() {
        // Close on background click
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.close();
            }
        });

        // Close on close button
        const closeBtn = this.modal.querySelector('.modal-close');
        if (closeBtn) {
            closeBtn.addEventListener('click', () => this.close());
        }

        // Close on Escape key
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.classList.contains('active')) {
                this.close();
            }
        });
    }

    open() {
        this.modal.classList.add('active');
        document.body.style.overflow = 'hidden'; // Prevent background scrolling
    }

    close() {
        this.modal.classList.remove('active');
        document.body.style.overflow = ''; // Restore scrolling
    }

    setTitle(title) {
        const titleElement = this.modal.querySelector('#modalTitle');
        if (titleElement) {
            titleElement.textContent = title;
        }
    }

    getForm() {
        return this.modal.querySelector('form');
    }

    resetForm() {
        const form = this.getForm();
        if (form) {
            form.reset();
        }
    }
}

// Export for use in other scripts
if (typeof window !== 'undefined') {
    window.Modal = Modal;
}
