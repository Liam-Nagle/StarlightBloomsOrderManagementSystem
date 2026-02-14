/**
 * Orders Page Logic
 * Handles order CRUD operations, filtering, and bouquet selection
 */

let orders = [];
let bouquets = [];
let currentOrderId = null;
let modal = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    modal = new Modal('orderModal');
    await loadBouquets();
    await loadOrders();
    setupEventListeners();
});

// Load all bouquets for dropdown
async function loadBouquets() {
    try {
        bouquets = await API.bouquets.getAll();
    } catch (error) {
        showToast('Failed to load bouquets: ' + error.message, 'error');
    }
}

// Load orders from API
async function loadOrders() {
    try {
        const status = document.getElementById('statusFilter')?.value || null;
        const startDate = document.getElementById('startDate')?.value || null;
        const endDate = document.getElementById('endDate')?.value || null;

        // API expects a filters object
        const filters = {};
        if (status) filters.status = status;
        if (startDate) filters.start_date = startDate;
        if (endDate) filters.end_date = endDate;

        orders = await API.orders.getAll(filters);
        renderOrdersTable();
    } catch (error) {
        showToast('Failed to load orders: ' + error.message, 'error');
    }
}

// Render orders table
function renderOrdersTable() {
    const tbody = document.getElementById('ordersTableBody');
    const emptyState = document.getElementById('emptyState');
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';

    // Filter orders by search query
    let filteredOrders = orders;
    if (searchQuery) {
        filteredOrders = orders.filter(order =>
            order.customer_name.toLowerCase().includes(searchQuery) ||
            order.order_number.toLowerCase().includes(searchQuery) ||
            order.bouquet_type.toLowerCase().includes(searchQuery)
        );
    }

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = filteredOrders.map(order => {
        const cost = order.cost !== null && order.cost !== undefined ? order.cost : 0;
        const profit = order.profit !== null && order.profit !== undefined ? order.profit : 0;
        const profitMargin = order.profit_margin !== null && order.profit_margin !== undefined ? order.profit_margin : 0;
        const profitColor = profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

        // Use _id as fallback if id is not present
        const orderId = order.id || order._id;

        return `
        <tr>
            <td><strong>${order.order_number}</strong></td>
            <td>${order.customer_name}</td>
            <td>${order.bouquet_type}</td>
            <td>${order.size.charAt(0).toUpperCase() + order.size.slice(1)}</td>
            <td>${formatDate(order.date)}</td>
            <td>${formatCurrency(order.total_price)}</td>
            <td>${formatCurrency(cost)}</td>
            <td style="color: ${profitColor}; font-weight: 600;">${formatCurrency(profit)}</td>
            <td><span class="badge badge-${profitMargin >= 50 ? 'success' : profitMargin >= 20 ? 'warning' : 'danger'}">${profitMargin.toFixed(1)}%</span></td>
            <td><span class="badge badge-${order.status}">${order.status}</span></td>
            <td>
                <div class="table-actions">
                    <button class="action-btn action-btn-view" onclick="viewOrder('${orderId}')">View</button>
                    <button class="action-btn action-btn-edit" onclick="editOrder('${orderId}')">Edit</button>
                    <button class="action-btn action-btn-delete" onclick="deleteOrder('${orderId}', '${order.order_number}')">Delete</button>
                </div>
            </td>
        </tr>
        `;
    }).join('');
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addOrderBtn')?.addEventListener('click', () => {
        currentOrderId = null;
        modal.setTitle('Create New Order');
        modal.resetForm();
        populateBouquetDropdown();
        modal.open();
    });

    document.getElementById('cancelBtn')?.addEventListener('click', () => {
        modal.close();
    });

    document.getElementById('orderForm')?.addEventListener('submit', handleFormSubmit);

    document.getElementById('searchInput')?.addEventListener('input', renderOrdersTable);
    document.getElementById('statusFilter')?.addEventListener('change', loadOrders);
    document.getElementById('startDate')?.addEventListener('change', loadOrders);
    document.getElementById('endDate')?.addEventListener('change', loadOrders);

    document.getElementById('bouquetSelect')?.addEventListener('change', handleBouquetSelection);
}

// Populate bouquet dropdown
function populateBouquetDropdown() {
    const select = document.getElementById('bouquetSelect');
    if (!select) return;

    select.innerHTML = '<option value="">Select bouquet</option>' +
        bouquets.map(b => `
            <option value="${b.id}" data-size="${b.size}" data-price="${b.sell_price}">
                ${b.name} - ${b.size.charAt(0).toUpperCase() + b.size.slice(1)} (${formatCurrency(b.sell_price)})
            </option>
        `).join('');
}

// Handle bouquet selection - auto-fill size and price
function handleBouquetSelection(e) {
    const selectedOption = e.target.options[e.target.selectedIndex];
    const size = selectedOption.dataset.size;
    const price = selectedOption.dataset.price;
    const bouquetName = selectedOption.text.split(' - ')[0];

    if (size && price) {
        document.getElementById('bouquetType').value = bouquetName;
        document.getElementById('size').value = size;
        document.getElementById('totalPrice').value = parseFloat(price).toFixed(2);
    }
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        customer_name: document.getElementById('customerName').value.trim(),
        bouquet_type: document.getElementById('bouquetType').value.trim(),
        size: document.getElementById('size').value,
        date: document.getElementById('date').value,
        delivery_address: document.getElementById('deliveryAddress').value.trim(),
        total_price: parseFloat(document.getElementById('totalPrice').value),
        status: document.getElementById('status').value,
        notes: document.getElementById('notes').value.trim() || null
    };

    try {
        if (currentOrderId) {
            await API.orders.update(currentOrderId, formData);
            showToast('Order updated successfully', 'success');
        } else {
            await API.orders.create(formData);
            showToast('Order created successfully', 'success');
        }

        modal.close();
        await loadOrders();
    } catch (error) {
        showToast('Failed to save order: ' + error.message, 'error');
    }
}

// View order details
function viewOrder(id) {
    const order = orders.find(o => o.id === id || o._id === id);
    if (!order) return;

    const cost = order.cost !== null && order.cost !== undefined ? order.cost : 0;
    const profit = order.profit !== null && order.profit !== undefined ? order.profit : 0;
    const profitMargin = order.profit_margin !== null && order.profit_margin !== undefined ? order.profit_margin : 0;
    const profitColor = profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

    const details = `
        <strong>Order Number:</strong> ${order.order_number}<br>
        <strong>Customer:</strong> ${order.customer_name}<br>
        <strong>Bouquet:</strong> ${order.bouquet_type} (${order.size})<br>
        <strong>Date:</strong> ${formatDate(order.date)}<br>
        <strong>Delivery:</strong> ${order.delivery_address}<br>
        <strong>Total Price:</strong> ${formatCurrency(order.total_price)}<br>
        <strong>Material Cost:</strong> ${formatCurrency(cost)}<br>
        <strong>Profit:</strong> <span style="color: ${profitColor};">${formatCurrency(profit)}</span><br>
        <strong>Profit Margin:</strong> ${profitMargin.toFixed(1)}%<br>
        <strong>Status:</strong> ${order.status}<br>
        ${order.notes ? `<strong>Notes:</strong> ${order.notes}` : ''}
    `;

    // Simple alert for now (could enhance with a better modal)
    const div = document.createElement('div');
    div.innerHTML = details;
    div.style.cssText = 'padding: 20px; background: white; border-radius: 8px; box-shadow: 0 4px 6px rgba(0,0,0,0.1);';

    // You could use a better modal system here
    alert(details.replace(/<br>/g, '\n').replace(/<\/?strong>/g, '').replace(/<span[^>]*>/g, '').replace(/<\/span>/g, ''));
}

// Edit order
async function editOrder(id) {
    const order = orders.find(o => o.id === id || o._id === id);
    if (!order) {
        showToast('Order not found', 'error');
        return;
    }
    currentOrderId = id;
    modal.setTitle('Edit Order');

    // Populate form
    document.getElementById('customerName').value = order.customer_name;
    document.getElementById('bouquetType').value = order.bouquet_type;
    document.getElementById('size').value = order.size;

    // Format date properly for input field (YYYY-MM-DD)
    const orderDate = new Date(order.date);
    const formattedDate = orderDate.toISOString().split('T')[0];
    document.getElementById('date').value = formattedDate;

    document.getElementById('deliveryAddress').value = order.delivery_address;
    document.getElementById('totalPrice').value = order.total_price;
    document.getElementById('status').value = order.status;
    document.getElementById('notes').value = order.notes || '';

    // Populate dropdown and try to select matching bouquet
    populateBouquetDropdown();
    const bouquetSelect = document.getElementById('bouquetSelect');
    const matchingBouquet = bouquets.find(b =>
        b.name === order.bouquet_type && b.size === order.size
    );
    if (matchingBouquet) {
        bouquetSelect.value = matchingBouquet.id;
    }

    modal.open();
}

// Delete order
async function deleteOrder(id, orderNumber) {
    if (!confirm(`Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`)) {
        return;
    }

    try {
        await API.orders.delete(id);
        showToast('Order deleted successfully', 'success');
        await loadOrders();
    } catch (error) {
        showToast('Failed to delete order: ' + error.message, 'error');
    }
}

// Make functions globally accessible for onclick handlers
window.viewOrder = viewOrder;
window.editOrder = editOrder;
window.deleteOrder = deleteOrder;
