/**
 * Searchable Select Component
 * A custom dropdown with search/filter functionality
 */

class SearchableSelect {
    constructor(container, options, onSelect) {
        this.container = container;
        this.options = options; // Array of {value, label, ...}
        this.onSelect = onSelect;
        this.selectedValue = null;
        this.isOpen = false;
        this.filteredOptions = [...options];

        this.render();
        this.attachEventListeners();
    }

    render() {
        this.container.innerHTML = `
            <div class="searchable-select">
                <input
                    type="text"
                    class="searchable-select-input"
                    placeholder="Search materials..."
                    autocomplete="off"
                >
                <div class="searchable-select-dropdown" style="display: none;">
                    <div class="searchable-select-options"></div>
                </div>
            </div>
        `;

        this.input = this.container.querySelector('.searchable-select-input');
        this.dropdown = this.container.querySelector('.searchable-select-dropdown');
        this.optionsContainer = this.container.querySelector('.searchable-select-options');

        this.renderOptions();
    }

    renderOptions() {
        if (this.filteredOptions.length === 0) {
            this.optionsContainer.innerHTML = '<div class="searchable-select-option searchable-select-empty">No materials found</div>';
            return;
        }

        this.optionsContainer.innerHTML = this.filteredOptions
            .map(option => `
                <div class="searchable-select-option" data-value="${option.value}">
                    <div class="searchable-select-option-main">${option.label}</div>
                    <div class="searchable-select-option-meta">${option.meta || ''}</div>
                </div>
            `)
            .join('');

        // Attach click handlers to options
        this.optionsContainer.querySelectorAll('.searchable-select-option').forEach(el => {
            if (!el.classList.contains('searchable-select-empty')) {
                el.addEventListener('click', () => this.selectOption(el.dataset.value));
            }
        });
    }

    attachEventListeners() {
        // Show dropdown on focus
        this.input.addEventListener('focus', () => {
            this.open();
        });

        // Filter on input
        this.input.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase();
            this.filteredOptions = this.options.filter(option =>
                option.label.toLowerCase().includes(query) ||
                (option.meta && option.meta.toLowerCase().includes(query))
            );
            this.renderOptions();
            this.open();
        });

        // Close on click outside
        document.addEventListener('click', (e) => {
            if (!this.container.contains(e.target)) {
                this.close();
            }
        });

        // Keyboard navigation
        this.input.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.close();
            } else if (e.key === 'Enter') {
                e.preventDefault();
                const firstOption = this.optionsContainer.querySelector('.searchable-select-option:not(.searchable-select-empty)');
                if (firstOption) {
                    this.selectOption(firstOption.dataset.value);
                }
            }
        });
    }

    open() {
        this.isOpen = true;
        this.dropdown.style.display = 'block';
    }

    close() {
        this.isOpen = false;
        this.dropdown.style.display = 'none';
    }

    selectOption(value) {
        this.selectedValue = value;
        const selectedOption = this.options.find(opt => opt.value === value);

        if (selectedOption) {
            this.input.value = selectedOption.label;
            this.input.dataset.selectedValue = value;
            this.close();

            if (this.onSelect) {
                this.onSelect(value, selectedOption);
            }
        }
    }

    getValue() {
        return this.input.dataset.selectedValue || null;
    }

    setValue(value) {
        const option = this.options.find(opt => opt.value === value);
        if (option) {
            this.selectOption(value);
        }
    }

    reset() {
        this.input.value = '';
        this.input.dataset.selectedValue = '';
        this.selectedValue = null;
        this.filteredOptions = [...this.options];
        this.renderOptions();
    }
}
