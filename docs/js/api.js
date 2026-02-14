/**
 * API Communication Layer
 * Centralized functions for making API requests
 */

/**
 * Make an API request
 * @param {string} endpoint - API endpoint path
 * @param {object} options - Fetch options
 * @returns {Promise} Response data
 */
async function fetchAPI(endpoint, options = {}) {
    const url = `${CONFIG.API_BASE_URL}${endpoint}`;

    const defaultOptions = {
        headers: {
            'Content-Type': 'application/json',
            ...options.headers
        },
        ...options
    };

    try {
        const response = await fetch(url, defaultOptions);

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            // Format error detail properly
            let errorMessage;
            if (typeof errorData.detail === 'string') {
                errorMessage = errorData.detail;
            } else if (Array.isArray(errorData.detail)) {
                // Pydantic validation errors
                errorMessage = errorData.detail.map(err => `${err.loc?.join('.')}: ${err.msg}`).join(', ');
            } else if (errorData.detail && typeof errorData.detail === 'object') {
                errorMessage = JSON.stringify(errorData.detail);
            } else {
                errorMessage = `HTTP error! status: ${response.status}`;
            }
            throw new Error(errorMessage);
        }

        return await response.json();
    } catch (error) {
        console.error('API Error:', error);
        showToast(error.message || 'An error occurred', 'error');
        throw error;
    }
}

/**
 * API Methods
 */
const API = {
    // Materials
    materials: {
        getAll: (type = null) => {
            const url = type ? `${CONFIG.ENDPOINTS.MATERIALS}?type=${type}` : CONFIG.ENDPOINTS.MATERIALS;
            return fetchAPI(url);
        },
        getOne: (id) => fetchAPI(`${CONFIG.ENDPOINTS.MATERIALS}/${id}`),
        create: (data) => fetchAPI(CONFIG.ENDPOINTS.MATERIALS, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchAPI(`${CONFIG.ENDPOINTS.MATERIALS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`${CONFIG.ENDPOINTS.MATERIALS}/${id}`, {
            method: 'DELETE'
        }),
        updateStock: (id, quantityChange) => fetchAPI(
            `${CONFIG.ENDPOINTS.MATERIALS}/${id}/stock?quantity_change=${quantityChange}`,
            { method: 'PUT' }
        ),
        getLowStock: () => fetchAPI(CONFIG.ENDPOINTS.MATERIALS_LOW_STOCK)
    },

    // Bouquets
    bouquets: {
        getAll: (size = null) => {
            const url = size ? `${CONFIG.ENDPOINTS.BOUQUETS}?size=${size}` : CONFIG.ENDPOINTS.BOUQUETS;
            return fetchAPI(url);
        },
        getOne: (id) => fetchAPI(`${CONFIG.ENDPOINTS.BOUQUETS}/${id}`),
        create: (data) => fetchAPI(CONFIG.ENDPOINTS.BOUQUETS, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchAPI(`${CONFIG.ENDPOINTS.BOUQUETS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`${CONFIG.ENDPOINTS.BOUQUETS}/${id}`, {
            method: 'DELETE'
        }),
        calculatePrice: (data) => fetchAPI(CONFIG.ENDPOINTS.BOUQUETS_CALCULATE, {
            method: 'POST',
            body: JSON.stringify(data)
        })
    },

    // Orders
    orders: {
        getAll: (filters = {}) => {
            const params = new URLSearchParams();
            if (filters.status) params.append('status', filters.status);
            if (filters.start_date) params.append('start_date', filters.start_date);
            if (filters.end_date) params.append('end_date', filters.end_date);
            if (filters.customer_name) params.append('customer_name', filters.customer_name);

            const url = params.toString()
                ? `${CONFIG.ENDPOINTS.ORDERS}?${params}`
                : CONFIG.ENDPOINTS.ORDERS;
            return fetchAPI(url);
        },
        getOne: (id) => fetchAPI(`${CONFIG.ENDPOINTS.ORDERS}/${id}`),
        create: (data) => fetchAPI(CONFIG.ENDPOINTS.ORDERS, {
            method: 'POST',
            body: JSON.stringify(data)
        }),
        update: (id, data) => fetchAPI(`${CONFIG.ENDPOINTS.ORDERS}/${id}`, {
            method: 'PUT',
            body: JSON.stringify(data)
        }),
        delete: (id) => fetchAPI(`${CONFIG.ENDPOINTS.ORDERS}/${id}`, {
            method: 'DELETE'
        }),
        updateStatus: (id, status) => fetchAPI(`${CONFIG.ENDPOINTS.ORDERS}/${id}/status?status=${status}`, {
            method: 'PUT'
        }),
        getToday: () => fetchAPI(CONFIG.ENDPOINTS.ORDERS_TODAY),
        getPending: () => fetchAPI(CONFIG.ENDPOINTS.ORDERS_PENDING),
        search: (query) => fetchAPI(`${CONFIG.ENDPOINTS.ORDERS_SEARCH}?q=${encodeURIComponent(query)}`)
    },

    // Reports
    reports: {
        getSalesSummary: (startDate = null, endDate = null) => {
            const params = new URLSearchParams();
            if (startDate) params.append('start_date', startDate);
            if (endDate) params.append('end_date', endDate);

            const url = params.toString()
                ? `${CONFIG.ENDPOINTS.REPORTS_SALES}?${params}`
                : CONFIG.ENDPOINTS.REPORTS_SALES;
            return fetchAPI(url);
        },
        getPopularBouquets: (limit = 10) => fetchAPI(`${CONFIG.ENDPOINTS.REPORTS_POPULAR}?limit=${limit}`),
        getProfitAnalysis: () => fetchAPI(CONFIG.ENDPOINTS.REPORTS_PROFIT),
        getInventoryStatus: () => fetchAPI(CONFIG.ENDPOINTS.REPORTS_INVENTORY),
        getMonthlyTrends: (months = 6) => fetchAPI(`${CONFIG.ENDPOINTS.REPORTS_TRENDS}?months=${months}`)
    }
};

// Export for use in other scripts
window.API = API;
