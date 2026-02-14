/**
 * Dashboard Page Logic
 */

// Load dashboard data on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadDashboardData();
});

/**
 * Load all dashboard data
 */
async function loadDashboardData() {
    try {
        // Load stats in parallel
        await Promise.all([
            loadStats(),
            loadRecentOrders(),
            loadLowStockAlert()
        ]);
    } catch (error) {
        console.error('Error loading dashboard:', error);
        showToast('Failed to load dashboard data', 'error');
    }
}

/**
 * Load dashboard statistics
 */
async function loadStats() {
    try {
        // Get today's orders
        const todayOrders = await API.orders.getToday();
        document.getElementById('todayOrders').textContent = todayOrders.length;

        // Calculate today's revenue
        const todayRevenue = todayOrders.reduce((sum, order) => sum + (order.total_price || 0), 0);
        document.getElementById('todayRevenue').textContent = formatCurrency(todayRevenue);

        // Calculate today's profit
        const todayProfit = todayOrders.reduce((sum, order) => {
            const profit = order.profit !== null && order.profit !== undefined ? order.profit : 0;
            return sum + profit;
        }, 0);
        const profitElement = document.getElementById('todayProfit');
        profitElement.textContent = formatCurrency(todayProfit);
        profitElement.style.color = todayProfit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

        // Get pending orders
        const pendingOrders = await API.orders.getPending();
        document.getElementById('pendingOrders').textContent = pendingOrders.length;

        // Get low stock count
        const lowStock = await API.materials.getLowStock();
        document.getElementById('lowStockCount').textContent = lowStock.length;

    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

/**
 * Load recent orders
 */
async function loadRecentOrders() {
    const tbody = document.getElementById('recentOrdersBody');

    try {
        const orders = await API.orders.getAll({ limit: 5 });

        if (orders.length === 0) {
            showEmptyState(tbody, 'No orders yet');
            return;
        }

        tbody.innerHTML = orders.map(order => `
            <tr>
                <td><strong>${order.order_number}</strong></td>
                <td>${order.customer_name}</td>
                <td>${order.bouquet_type} - ${capitalize(order.size)}</td>
                <td>${formatDate(order.date)}</td>
                <td>${formatCurrency(order.total_price)}</td>
                <td>${getStatusBadge(order.status)}</td>
            </tr>
        `).join('');

    } catch (error) {
        console.error('Error loading recent orders:', error);
        tbody.innerHTML = '<tr><td colspan="6" class="loading">Failed to load orders</td></tr>';
    }
}

/**
 * Load low stock alert
 */
async function loadLowStockAlert() {
    try {
        const lowStock = await API.materials.getLowStock();

        if (lowStock.length === 0) {
            document.getElementById('lowStockSection').style.display = 'none';
            return;
        }

        document.getElementById('lowStockSection').style.display = 'block';

        const lowStockList = document.getElementById('lowStockList');
        lowStockList.innerHTML = lowStock.map(material => {
            const stock = parseFloat(material.current_stock || 0).toFixed(2);
            const threshold = parseFloat(material.low_stock_threshold || 10).toFixed(2);
            return `
                <div class="alert alert-warning" style="padding: 1rem; margin-bottom: 0.5rem; background: #FEF3C7; border-left: 4px solid #F59E0B; border-radius: 0.5rem;">
                    <strong>${material.name}</strong> - Only ${stock} in stock (alert threshold: ${threshold})
                </div>
            `;
        }).join('');

    } catch (error) {
        console.error('Error loading low stock:', error);
    }
}
