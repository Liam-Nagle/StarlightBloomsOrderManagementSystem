/**
 * Orders Page Logic
 * Handles order CRUD operations with multi-item bouquet support
 */

let orders = [];
let bouquets = [];
let currentOrderId = null;
let modal = null;
let orderItemCounter = 0;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    modal = new Modal('orderModal');
    await loadBouquets();
    await loadOrders();
    setupEventListeners();
});

async function loadBouquets() {
    try {
        bouquets = await API.bouquets.getAll();
    } catch (error) {
        showToast('Failed to load bouquets: ' + error.message, 'error');
    }
}

async function loadOrders() {
    try {
        const status = document.getElementById('statusFilter')?.value || null;
        const startDate = document.getElementById('startDate')?.value || null;
        const endDate = document.getElementById('endDate')?.value || null;

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

    let filteredOrders = orders;
    if (searchQuery) {
        filteredOrders = orders.filter(order => {
            const itemsText = (order.items || [])
                .map(i => `${i.bouquet_type} ${i.size}`)
                .join(' ')
                .toLowerCase();
            return (
                order.customer_name.toLowerCase().includes(searchQuery) ||
                order.order_number.toLowerCase().includes(searchQuery) ||
                itemsText.includes(searchQuery)
            );
        });
    }

    if (filteredOrders.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = filteredOrders.map(order => {
        const cost = order.cost ?? 0;
        const profit = order.profit ?? 0;
        const profitMargin = order.profit_margin ?? 0;
        const profitColor = profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';
        const orderId = order.id || order._id;

        // Summarise items for table cell
        const itemsSummary = (order.items || [])
            .map(i => `${i.bouquet_type} (${i.size.charAt(0).toUpperCase() + i.size.slice(1)})${i.quantity > 1 ? ` x${i.quantity}` : ''}`)
            .join('<br>');

        return `
        <tr>
            <td><strong>${order.order_number}</strong></td>
            <td>${order.customer_name}</td>
            <td style="font-size:0.8rem;">${itemsSummary || '—'}</td>
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
        </tr>`;
    }).join('');
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addOrderBtn')?.addEventListener('click', () => {
        currentOrderId = null;
        orderItemCounter = 0;
        modal.setTitle('Create New Order');
        modal.resetForm();
        document.getElementById('orderItemsContainer').innerHTML = '';
        addOrderItemRow();
        modal.open();
    });

    document.getElementById('cancelBtn')?.addEventListener('click', () => modal.close());
    document.getElementById('addItemBtn')?.addEventListener('click', addOrderItemRow);
    document.getElementById('orderForm')?.addEventListener('submit', handleFormSubmit);
    document.getElementById('searchInput')?.addEventListener('input', renderOrdersTable);
    document.getElementById('statusFilter')?.addEventListener('change', loadOrders);
    document.getElementById('startDate')?.addEventListener('change', loadOrders);
    document.getElementById('endDate')?.addEventListener('change', loadOrders);
}

// Add a bouquet item row to the order form
function addOrderItemRow(itemData = null) {
    const container = document.getElementById('orderItemsContainer');
    const rowId = `order-item-${orderItemCounter++}`;

    const row = document.createElement('div');
    row.id = rowId;
    row.style.cssText = 'display: flex; gap: var(--spacing-md); align-items: end; margin-bottom: var(--spacing-sm);';

    row.innerHTML = `
        <div class="form-group" style="flex: 2;">
            <label>Bouquet</label>
            <select class="item-bouquet-select" required>
                <option value="">Select bouquet</option>
                ${bouquets.map(b => `
                    <option value="${b.id}"
                        data-name="${b.name}"
                        data-size="${b.size}"
                        data-price="${b.sell_price}"
                        ${itemData && b.name === itemData.bouquet_type && b.size === itemData.size ? 'selected' : ''}>
                        ${b.name} - ${b.size.charAt(0).toUpperCase() + b.size.slice(1)} (${formatCurrency(b.sell_price)})
                    </option>
                `).join('')}
            </select>
        </div>
        <div class="form-group" style="flex: 0 0 80px;">
            <label>Qty</label>
            <input type="number" class="item-quantity" min="1" value="${itemData?.quantity || 1}" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="removeOrderItemRow('${rowId}')" style="height: 38px;">✕</button>
    `;

    container.appendChild(row);

    // Auto-update total price when bouquet or quantity changes
    row.querySelector('.item-bouquet-select').addEventListener('change', recalculateTotalPrice);
    row.querySelector('.item-quantity').addEventListener('input', recalculateTotalPrice);
}

window.removeOrderItemRow = function(rowId) {
    document.getElementById(rowId)?.remove();
    recalculateTotalPrice();
};

// Auto-sum total price from all selected bouquets
function recalculateTotalPrice() {
    const rows = document.querySelectorAll('#orderItemsContainer > div');
    let total = 0;

    rows.forEach(row => {
        const select = row.querySelector('.item-bouquet-select');
        const qty = parseInt(row.querySelector('.item-quantity').value) || 1;
        const selectedOption = select.options[select.selectedIndex];
        const price = parseFloat(selectedOption?.dataset?.price || 0);
        total += price * qty;
    });

    if (total > 0) {
        document.getElementById('totalPrice').value = total.toFixed(2);
    }
}

// Get items array from form
function getItemsFromForm() {
    const rows = document.querySelectorAll('#orderItemsContainer > div');
    const items = [];

    rows.forEach(row => {
        const select = row.querySelector('.item-bouquet-select');
        const qty = parseInt(row.querySelector('.item-quantity').value) || 1;
        const selectedOption = select.options[select.selectedIndex];

        if (select.value && selectedOption) {
            items.push({
                bouquet_type: selectedOption.dataset.name,
                size: selectedOption.dataset.size,
                quantity: qty
            });
        }
    });

    return items;
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const items = getItemsFromForm();
    if (items.length === 0) {
        showToast('Please add at least one bouquet', 'error');
        return;
    }

    const status = document.getElementById('status').value;
    const trackingNumber = document.getElementById('trackingNumber').value.trim();

    if (status === 'dispatched' && !trackingNumber) {
        showToast('Tracking number is required when dispatching an order', 'error');
        return;
    }

    const formData = {
        customer_name: document.getElementById('customerName').value.trim(),
        items,
        date: document.getElementById('date').value,
        delivery_address: document.getElementById('deliveryAddress').value.trim(),
        total_price: parseFloat(document.getElementById('totalPrice').value),
        status,
        delivery_type: document.getElementById('deliveryType').value,
        tracking_number: trackingNumber || null,
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

    const cost = order.cost ?? 0;
    const profit = order.profit ?? 0;
    const profitMargin = order.profit_margin ?? 0;
    const profitColor = profit >= 0 ? 'var(--success-color)' : 'var(--danger-color)';

    const itemsList = (order.items || [])
        .map(i => `• ${i.bouquet_type} (${i.size}) x${i.quantity}`)
        .join('\n');

    const deliveryLabel = order.delivery_type === 'next_day' ? 'Next Day Delivery' : 'Standard Delivery';

    alert([
        `Order: ${order.order_number}`,
        `Customer: ${order.customer_name}`,
        `Items:\n${itemsList}`,
        `Date: ${formatDate(order.date)}`,
        `Delivery Type: ${deliveryLabel}`,
        `Delivery Address: ${order.delivery_address}`,
        `Total: ${formatCurrency(order.total_price)}`,
        `Cost: ${formatCurrency(cost)}`,
        `Profit: ${formatCurrency(profit)} (${profitMargin.toFixed(1)}%)`,
        `Status: ${order.status}`,
        order.tracking_number ? `Tracking Number: ${order.tracking_number}` : '',
        order.notes ? `Notes: ${order.notes}` : ''
    ].filter(Boolean).join('\n'));
}

// Edit order
async function editOrder(id) {
    const order = orders.find(o => o.id === id || o._id === id);
    if (!order) { showToast('Order not found', 'error'); return; }

    currentOrderId = id;
    orderItemCounter = 0;
    modal.setTitle('Edit Order');

    document.getElementById('customerName').value = order.customer_name;
    document.getElementById('date').value = new Date(order.date).toISOString().split('T')[0];
    document.getElementById('deliveryAddress').value = order.delivery_address;
    document.getElementById('totalPrice').value = order.total_price;
    document.getElementById('status').value = order.status;
    document.getElementById('deliveryType').value = order.delivery_type || 'standard';
    document.getElementById('trackingNumber').value = order.tracking_number || '';
    document.getElementById('notes').value = order.notes || '';

    // Populate item rows
    const container = document.getElementById('orderItemsContainer');
    container.innerHTML = '';
    (order.items || []).forEach(item => addOrderItemRow(item));

    modal.open();
}

// Delete order
async function deleteOrder(id, orderNumber) {
    if (!confirm(`Are you sure you want to delete order ${orderNumber}?`)) return;

    try {
        await API.orders.delete(id);
        showToast('Order deleted successfully', 'success');
        await loadOrders();
    } catch (error) {
        showToast('Failed to delete order: ' + error.message, 'error');
    }
}

window.viewOrder = viewOrder;
window.editOrder = editOrder;
window.deleteOrder = deleteOrder;
