/**
 * Orders Page Logic
 * Handles order CRUD operations with multi-item bouquet support
 */

let orders = [];
let bouquets = [];
let allMaterials = [];
let currentOrderId = null;
let currentActualMaterialsOrderId = null;
let modal = null;
let actualMaterialsModal = null;
let orderItemCounter = 0;
let actualMaterialRowCounters = {};

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    modal = new Modal('orderModal');
    actualMaterialsModal = new Modal('actualMaterialsModal');
    await loadBouquets();
    await loadMaterialsList();
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

async function loadMaterialsList() {
    try {
        allMaterials = await API.materials.getAll();
    } catch (error) {
        console.warn('Failed to load materials:', error.message);
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
                    <button class="action-btn" style="background: var(--primary-color); color: white;" onclick="openActualMaterialsModal('${orderId}')">Materials</button>
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

    document.getElementById('closeActualMaterialsModal')?.addEventListener('click', () => actualMaterialsModal.close());
    document.getElementById('cancelActualMaterialsBtn')?.addEventListener('click', () => actualMaterialsModal.close());
    document.getElementById('saveActualMaterialsBtn')?.addEventListener('click', saveActualMaterials);
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
window.openActualMaterialsModal = openActualMaterialsModal;

// ---------------------------------------------------------------------------
// Actual Materials Modal
// ---------------------------------------------------------------------------

async function openActualMaterialsModal(orderId) {
    const order = orders.find(o => o.id === orderId || o._id === orderId);
    if (!order) { showToast('Order not found', 'error'); return; }

    currentActualMaterialsOrderId = orderId;
    actualMaterialRowCounters = {};

    const accordion = document.getElementById('actualMaterialsAccordion');
    accordion.innerHTML = '';

    const items = order.items || [];

    items.forEach((item, idx) => {
        const containerId = `actual-materials-item-${idx}`;
        actualMaterialRowCounters[containerId] = 0;

        const section = document.createElement('div');
        section.style.cssText = 'border: 1px solid var(--border-color); border-radius: var(--radius-md); margin-bottom: var(--spacing-md); overflow: hidden;';

        const header = document.createElement('div');
        header.style.cssText = 'padding: var(--spacing-sm) var(--spacing-md); background: var(--bg-light); cursor: pointer; display: flex; justify-content: space-between; align-items: center; font-weight: 600;';
        header.innerHTML = `
            <span>${item.bouquet_type} (${item.size}) x${item.quantity}</span>
            <span style="font-size: 0.75rem; color: var(--text-secondary);">Cost: £<span class="item-cost-total" id="${containerId}-total">0.00</span></span>
        `;

        const body = document.createElement('div');
        body.style.cssText = 'padding: var(--spacing-md);';

        const rowsContainer = document.createElement('div');
        rowsContainer.id = containerId;
        body.appendChild(rowsContainer);

        const addBtn = document.createElement('button');
        addBtn.type = 'button';
        addBtn.className = 'btn btn-secondary';
        addBtn.style.cssText = 'margin-top: var(--spacing-sm); padding: 0.25rem 0.75rem; font-size: 0.875rem;';
        addBtn.textContent = '+ Add Material';
        addBtn.addEventListener('click', () => addActualMaterialRow(containerId));
        body.appendChild(addBtn);

        section.appendChild(header);
        section.appendChild(body);
        accordion.appendChild(section);

        // Pre-fill: use actual_materials if set, else fall back to bouquet recipe
        const prefillMaterials = item.actual_materials && item.actual_materials.length > 0
            ? item.actual_materials
            : getBouquetRecipeMaterials(item.bouquet_type, item.size);

        if (prefillMaterials.length > 0) {
            prefillMaterials.forEach(m => addActualMaterialRow(containerId, m));
        } else {
            addActualMaterialRow(containerId);
        }
    });

    actualMaterialsModal.open();
}

function getBouquetRecipeMaterials(bouquetType, size) {
    const bouquet = bouquets.find(b =>
        b.name.toLowerCase() === bouquetType.toLowerCase() && b.size === size
    );
    return bouquet ? (bouquet.materials || []) : [];
}

function addActualMaterialRow(containerId, materialData = null) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const rowIdx = actualMaterialRowCounters[containerId]++;
    const rowId = `${containerId}-row-${rowIdx}`;

    const row = document.createElement('div');
    row.id = rowId;
    row.className = 'form-row';
    row.style.cssText = 'align-items: end; margin-bottom: var(--spacing-sm);';

    row.innerHTML = `
        <div class="form-group" style="flex: 2;">
            <label>Material</label>
            <div class="material-select-container"></div>
        </div>
        <div class="form-group" style="flex: 1;">
            <label>Qty</label>
            <input type="number" class="actual-material-quantity" step="0.01" min="0.01" value="${materialData?.quantity || 1}">
        </div>
        <div class="form-group" style="flex: 1;">
            <label>Cost/Unit (£)</label>
            <input type="number" class="actual-material-cost-per-unit" step="0.01" min="0" value="${materialData?.cost_per_unit ?? ''}">
        </div>
        <button type="button" class="btn btn-danger" onclick="removeActualMaterialRow('${containerId}', '${rowId}')" style="height: 38px;">✕</button>
    `;

    container.appendChild(row);

    const options = allMaterials.map(m => ({
        value: m.id,
        label: m.name,
        meta: `${formatCurrency(m.cost_per_unit)}/${m.unit}`
    }));

    const selectContainer = row.querySelector('.material-select-container');
    const searchableSelect = new SearchableSelect(selectContainer, options, () => {
        const selected = allMaterials.find(m => m.id === searchableSelect.getValue());
        if (selected) {
            row.querySelector('.actual-material-cost-per-unit').value = selected.cost_per_unit.toFixed(2);
        }
        updateItemCostTotal(containerId);
    });

    if (materialData?.material_id) {
        searchableSelect.setValue(materialData.material_id);
    }

    row.searchableSelect = searchableSelect;

    row.querySelector('.actual-material-quantity').addEventListener('input', () => updateItemCostTotal(containerId));
    row.querySelector('.actual-material-cost-per-unit').addEventListener('input', () => updateItemCostTotal(containerId));

    updateItemCostTotal(containerId);
}

window.removeActualMaterialRow = function(containerId, rowId) {
    document.getElementById(rowId)?.remove();
    updateItemCostTotal(containerId);
};

function updateItemCostTotal(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;

    let total = 0;
    container.querySelectorAll('.form-row').forEach(row => {
        const qty = parseFloat(row.querySelector('.actual-material-quantity')?.value) || 0;
        const cpu = parseFloat(row.querySelector('.actual-material-cost-per-unit')?.value) || 0;
        total += qty * cpu;
    });

    const totalEl = document.getElementById(`${containerId}-total`);
    if (totalEl) totalEl.textContent = total.toFixed(2);
}

function getActualMaterialsFromContainer(containerId) {
    const container = document.getElementById(containerId);
    if (!container) return [];

    const result = [];
    container.querySelectorAll('.form-row').forEach(row => {
        const materialId = row.searchableSelect?.getValue();
        const quantity = parseFloat(row.querySelector('.actual-material-quantity')?.value) || 0;
        const costPerUnit = parseFloat(row.querySelector('.actual-material-cost-per-unit')?.value) || 0;

        if (materialId && quantity > 0) {
            const material = allMaterials.find(m => m.id === materialId);
            result.push({
                material_id: materialId,
                name: material?.name || '',
                quantity,
                cost_per_unit: costPerUnit,
                total_cost: parseFloat((quantity * costPerUnit).toFixed(2))
            });
        }
    });

    return result;
}

async function saveActualMaterials() {
    const order = orders.find(o => o.id === currentActualMaterialsOrderId || o._id === currentActualMaterialsOrderId);
    if (!order) { showToast('Order not found', 'error'); return; }

    const items = (order.items || []).map((item, idx) => {
        const containerId = `actual-materials-item-${idx}`;
        const actualMaterials = getActualMaterialsFromContainer(containerId);
        return {
            bouquet_type: item.bouquet_type,
            size: item.size,
            quantity: item.quantity,
            actual_materials: actualMaterials.length > 0 ? actualMaterials : null
        };
    });

    try {
        await API.orders.update(currentActualMaterialsOrderId, { items });
        showToast('Actual materials saved. Cost recalculated.', 'success');
        actualMaterialsModal.close();
        await loadOrders();
    } catch (error) {
        showToast('Failed to save actual materials: ' + error.message, 'error');
    }
}
