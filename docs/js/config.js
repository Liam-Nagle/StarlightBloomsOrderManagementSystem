/**
 * API Configuration
 * Automatically detects environment and uses appropriate API URL
 */

const CONFIG = {
    // API Base URL - automatically switches based on environment
    API_BASE_URL: window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
        ? 'http://localhost:8000'
        : 'https://starlightbloomsordermanagementsystem.onrender.com',  // Replace with your actual Render URL

    // API Endpoints
    ENDPOINTS: {
        // Materials
        MATERIALS: '/api/materials',
        MATERIALS_LOW_STOCK: '/api/materials/low-stock',

        // Bouquets
        BOUQUETS: '/api/bouquets',
        BOUQUETS_CALCULATE: '/api/bouquets/calculate-price',

        // Orders
        ORDERS: '/api/orders',
        ORDERS_TODAY: '/api/orders/today',
        ORDERS_PENDING: '/api/orders/pending',
        ORDERS_SEARCH: '/api/orders/search',

        // Reports
        REPORTS_SALES: '/api/reports/sales-summary',
        REPORTS_POPULAR: '/api/reports/popular-bouquets',
        REPORTS_PROFIT: '/api/reports/profit-analysis',
        REPORTS_INVENTORY: '/api/reports/inventory-status',
        REPORTS_TRENDS: '/api/reports/monthly-trends'
    }
};

// Export for use in other scripts
window.CONFIG = CONFIG;
