/**
 * Reports Page Logic
 * Displays analytics, sales summary, popular bouquets, and profit analysis
 */

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    setDefaultDateRange();
    await loadAllReports();
    setupEventListeners();
});

// Set default date range (last 30 days)
function setDefaultDateRange() {
    const endDate = new Date();
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - 30);

    document.getElementById('startDate').value = startDate.toISOString().split('T')[0];
    document.getElementById('endDate').value = endDate.toISOString().split('T')[0];
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('refreshBtn')?.addEventListener('click', loadAllReports);
    document.getElementById('startDate')?.addEventListener('change', loadAllReports);
    document.getElementById('endDate')?.addEventListener('change', loadAllReports);
}

// Load all reports
async function loadAllReports() {
    await Promise.all([
        loadSalesSummary(),
        loadPopularBouquets(),
        loadProfitAnalysis(),
        loadStatusBreakdown()
    ]);
}

// Load sales summary
async function loadSalesSummary() {
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        const summary = await API.reports.getSalesSummary(startDate, endDate);

        document.getElementById('totalRevenue').textContent = formatCurrency(summary.total_revenue || 0);
        document.getElementById('totalOrders').textContent = summary.total_orders || 0;
        document.getElementById('avgOrderValue').textContent = formatCurrency(summary.average_order_value || 0);
        document.getElementById('completedOrders').textContent = summary.completed_orders || 0;

        // Calculate total profit from orders
        const filters = {};
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;

        const orders = await API.orders.getAll(filters);
        const totalProfit = orders.reduce((sum, order) => {
            const profit = order.profit !== null && order.profit !== undefined ? order.profit : 0;
            return sum + profit;
        }, 0);

        const profitElement = document.getElementById('totalProfit');
        profitElement.textContent = formatCurrency(totalProfit);
        profitElement.style.color = totalProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
    } catch (error) {
        showToast('Failed to load sales summary: ' + error.message, 'error');
    }
}

// Load popular bouquets
async function loadPopularBouquets() {
    try {
        const response = await API.reports.getPopularBouquets(10);
        const tbody = document.getElementById('popularBouquetsTable');
        const emptyState = document.getElementById('popularBouquetsEmpty');

        // Extract the array from the response
        const popular = response.top_bouquets || [];

        if (!popular || popular.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        tbody.innerHTML = popular.map((item, index) => `
            <tr>
                <td><strong>${index + 1}</strong></td>
                <td>${item.bouquet_type}</td>
                <td>${item.size.charAt(0).toUpperCase() + item.size.slice(1)}</td>
                <td><span class="badge badge-primary">${item.order_count}</span></td>
                <td><strong>${formatCurrency(item.total_revenue)}</strong></td>
            </tr>
        `).join('');
    } catch (error) {
        showToast('Failed to load popular bouquets: ' + error.message, 'error');
    }
}

// Load profit analysis
async function loadProfitAnalysis() {
    try {
        const response = await API.reports.getProfitAnalysis();
        const tbody = document.getElementById('profitAnalysisTable');
        const emptyState = document.getElementById('profitAnalysisEmpty');

        // Extract the array from the response
        const analysis = response.bouquets || [];

        if (!analysis || analysis.length === 0) {
            tbody.innerHTML = '';
            emptyState.style.display = 'block';
            return;
        }

        emptyState.style.display = 'none';
        tbody.innerHTML = analysis.map(item => {
            const marginClass = item.profit_margin >= 50 ? 'success' : item.profit_margin >= 30 ? 'warning' : 'danger';

            return `
                <tr>
                    <td><strong>${item.name}</strong></td>
                    <td>${item.size.charAt(0).toUpperCase() + item.size.slice(1)}</td>
                    <td>${formatCurrency(item.total_cost)}</td>
                    <td>${formatCurrency(item.sell_price)}</td>
                    <td style="color: var(--success-color);"><strong>${formatCurrency(item.profit)}</strong></td>
                    <td><span class="badge badge-${marginClass}">${item.profit_margin.toFixed(1)}%</span></td>
                </tr>
            `;
        }).join('');
    } catch (error) {
        showToast('Failed to load profit analysis: ' + error.message, 'error');
    }
}

// Load order status breakdown
async function loadStatusBreakdown() {
    try {
        const startDate = document.getElementById('startDate').value;
        const endDate = document.getElementById('endDate').value;

        // API expects a filters object
        const filters = {};
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;

        const orders = await API.orders.getAll(filters);

        const pending = orders.filter(o => o.status === 'pending').length;
        const completed = orders.filter(o => o.status === 'completed').length;
        const cancelled = orders.filter(o => o.status === 'cancelled').length;

        document.getElementById('pendingCount').textContent = pending;
        document.getElementById('completedCount').textContent = completed;
        document.getElementById('cancelledCount').textContent = cancelled;
    } catch (error) {
        showToast('Failed to load status breakdown: ' + error.message, 'error');
    }
}
