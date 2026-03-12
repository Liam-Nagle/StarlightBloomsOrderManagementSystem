/**
 * Utility Functions
 */

/**
 * Format date to readable string
 * @param {string|Date} date - Date to format
 * @returns {string} Formatted date
 */
function formatDate(date) {
    if (!date) return '';
    const d = new Date(date);
    return d.toLocaleDateString('en-GB', {
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

/**
 * Format currency
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatCurrency(amount) {
    return `£${Number(amount).toFixed(2)}`;
}

/**
 * Get status badge HTML
 * @param {string} status - Status value
 * @returns {string} HTML for status badge
 */
function getStatusBadge(status) {
    const badgeClass = `badge badge-${status}`;
    const statusText = status.charAt(0).toUpperCase() + status.slice(1);
    return `<span class="${badgeClass}">${statusText}</span>`;
}

/**
 * Debounce function
 * @param {Function} func - Function to debounce
 * @param {number} wait - Wait time in milliseconds
 * @returns {Function} Debounced function
 */
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

/**
 * Show loading state
 * @param {HTMLElement} element - Element to show loading in
 * @param {string} message - Loading message
 */
function showLoading(element, message = 'Loading...') {
    element.innerHTML = `
        <tr>
            <td colspan="100" class="loading">
                <div class="spinner"></div>
                <p>${message}</p>
            </td>
        </tr>
    `;
}

/**
 * Show empty state
 * @param {HTMLElement} element - Element to show empty state in
 * @param {string} message - Empty state message
 */
function showEmptyState(element, message = 'No data found') {
    element.innerHTML = `
        <tr>
            <td colspan="100" class="loading">${message}</td>
        </tr>
    `;
}

/**
 * Validate form
 * @param {HTMLFormElement} form - Form to validate
 * @returns {boolean} Whether form is valid
 */
function validateForm(form) {
    return form.checkValidity();
}

/**
 * Get form data as object
 * @param {HTMLFormElement} form - Form element
 * @returns {object} Form data as object
 */
function getFormData(form) {
    const formData = new FormData(form);
    const data = {};

    for (let [key, value] of formData.entries()) {
        data[key] = value;
    }

    return data;
}

/**
 * Build SearchableSelect options from a materials array, with optional stock filter.
 * @param {Array} materials - Full materials list
 * @param {string} stockFilter - '', 'in_stock', 'low_stock', or 'out_of_stock'
 * @returns {Array} Options array for SearchableSelect
 */
function buildMaterialOptions(materials, stockFilter = '') {
    let filtered = materials;
    if (stockFilter) {
        filtered = materials.filter(m => {
            const stock = m.current_stock ?? 0;
            const threshold = m.low_stock_threshold ?? 10;
            if (stockFilter === 'out_of_stock') return stock <= 0;
            if (stockFilter === 'low_stock') return stock > 0 && stock <= threshold;
            if (stockFilter === 'in_stock') return stock > 0;
            return true;
        });
    }
    return filtered.map(m => ({
        value: m.id,
        label: m.name,
        meta: `${formatCurrency(m.cost_per_unit)}/${m.unit}`
    }));
}

/**
 * Capitalize first letter
 * @param {string} string - String to capitalize
 * @returns {string} Capitalized string
 */
function capitalize(string) {
    return string.charAt(0).toUpperCase() + string.slice(1);
}
