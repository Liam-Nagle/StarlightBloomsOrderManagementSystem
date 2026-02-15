/**
 * Bouquets Page Logic
 * Handles bouquet CRUD, material selection, and pricing calculations
 */

let bouquets = [];
let materials = [];
let currentBouquetId = null;
let modal = null;
let materialRowCounter = 0;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    modal = new Modal('bouquetModal');
    await loadMaterials();
    await loadBouquets();
    setupEventListeners();
});

// Load materials from API
async function loadMaterials() {
    try {
        materials = await API.materials.getAll();
    } catch (error) {
        showToast('Failed to load materials: ' + error.message, 'error');
    }
}

// Load bouquets from API
async function loadBouquets() {
    try {
        const size = document.getElementById('sizeFilter')?.value || null;
        bouquets = await API.bouquets.getAll(size);
        renderBouquetsTable();
    } catch (error) {
        showToast('Failed to load bouquets: ' + error.message, 'error');
    }
}

// Render bouquets table
function renderBouquetsTable() {
    const tbody = document.getElementById('bouquetsTableBody');
    const emptyState = document.getElementById('emptyState');
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';

    // Filter bouquets by search query
    let filteredBouquets = bouquets;
    if (searchQuery) {
        filteredBouquets = bouquets.filter(b =>
            b.name.toLowerCase().includes(searchQuery) ||
            b.size.toLowerCase().includes(searchQuery)
        );
    }

    if (filteredBouquets.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = filteredBouquets.map(bouquet => `
        <tr>
            <td><strong>${bouquet.name}</strong></td>
            <td>${bouquet.size.charAt(0).toUpperCase() + bouquet.size.slice(1)}</td>
            <td>${bouquet.materials.length} items</td>
            <td>${formatCurrency(bouquet.total_cost)}</td>
            <td>${formatCurrency(bouquet.calculated_sale_price)}</td>
            <td><strong>${formatCurrency(bouquet.sell_price)}</strong></td>
            <td style="color: var(--success-color);">${formatCurrency(bouquet.profit)}</td>
            <td><span class="badge badge-${bouquet.profit_margin >= 50 ? 'success' : 'warning'}">${bouquet.profit_margin.toFixed(1)}%</span></td>
            <td>
                <div class="table-actions">
                    <button class="action-btn action-btn-view" onclick="viewBouquet('${bouquet.id}')">View</button>
                    <button class="action-btn action-btn-edit" onclick="editBouquet('${bouquet.id}')">Edit</button>
                    <button class="action-btn action-btn-delete" onclick="deleteBouquet('${bouquet.id}', '${bouquet.name}')">Delete</button>
                </div>
            </td>
        </tr>
    `).join('');
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addBouquetBtn')?.addEventListener('click', () => {
        currentBouquetId = null;
        materialRowCounter = 0;
        modal.setTitle('Add Bouquet');
        modal.resetForm();
        document.getElementById('materialsContainer').innerHTML = '';
        document.getElementById('pricingPreview').style.display = 'none';
        addMaterialRow();
        modal.open();
    });

    document.getElementById('cancelBtn')?.addEventListener('click', () => {
        modal.close();
    });

    document.getElementById('addMaterialBtn')?.addEventListener('click', addMaterialRow);

    document.getElementById('bouquetForm')?.addEventListener('submit', handleFormSubmit);

    document.getElementById('searchInput')?.addEventListener('input', renderBouquetsTable);
    document.getElementById('sizeFilter')?.addEventListener('change', loadBouquets);

    // Listen for size changes to update pricing preview
    document.getElementById('size')?.addEventListener('change', updatePricingPreview);
}

// Add material selection row
function addMaterialRow(materialData = null) {
    const container = document.getElementById('materialsContainer');
    const rowId = `material-row-${materialRowCounter++}`;

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
            <label>Quantity</label>
            <input type="number" class="material-quantity" step="0.01" min="0.01" value="${materialData?.quantity || 1}" required>
        </div>
        <button type="button" class="btn btn-danger" onclick="removeMaterialRow('${rowId}')" style="height: 38px;">✕</button>
    `;

    container.appendChild(row);

    // Create searchable select options
    const options = materials.map(m => ({
        value: m.id,
        label: m.name,
        meta: `${formatCurrency(m.cost_per_unit)}/${m.unit}`
    }));

    // Initialize searchable select
    const selectContainer = row.querySelector('.material-select-container');
    const searchableSelect = new SearchableSelect(
        selectContainer,
        options,
        () => updatePricingPreview()
    );

    // Set pre-selected value if editing
    if (materialData?.material_id) {
        searchableSelect.setValue(materialData.material_id);
    }

    // Store reference to searchable select for later retrieval
    row.searchableSelect = searchableSelect;

    // Add listener for quantity changes
    row.querySelector('.material-quantity').addEventListener('input', updatePricingPreview);
}

// Remove material row
window.removeMaterialRow = function(rowId) {
    document.getElementById(rowId)?.remove();
    updatePricingPreview();
};

// Update pricing preview
async function updatePricingPreview() {
    const size = document.getElementById('size').value;
    if (!size) {
        document.getElementById('pricingPreview').style.display = 'none';
        return;
    }

    const materialsData = getMaterialsFromForm();
    if (materialsData.length === 0) {
        document.getElementById('pricingPreview').style.display = 'none';
        return;
    }

    try {
        const pricing = await API.bouquets.calculatePrice({
            materials: materialsData,
            size: size
        });

        document.getElementById('previewTotalCost').textContent = pricing.total_cost.toFixed(2);
        document.getElementById('previewCalcPrice').textContent = pricing.calculated_sale_price.toFixed(2);
        document.getElementById('previewProfit').textContent = pricing.profit.toFixed(2);
        document.getElementById('previewMargin').textContent = pricing.profit_margin.toFixed(1);

        // Auto-populate sell price with calculated price
        const sellPriceInput = document.getElementById('sellPrice');
        if (!sellPriceInput.value || currentBouquetId === null) {
            sellPriceInput.value = pricing.calculated_sale_price.toFixed(2);
        }

        document.getElementById('pricingPreview').style.display = 'block';
    } catch (error) {
        console.error('Failed to calculate pricing:', error);
    }
}

// Get materials data from form
function getMaterialsFromForm() {
    const rows = document.querySelectorAll('#materialsContainer .form-row');
    const materialsData = [];

    rows.forEach(row => {
        const materialId = row.searchableSelect?.getValue();
        const quantity = parseFloat(row.querySelector('.material-quantity').value);

        if (materialId && quantity > 0) {
            // Find the material details from the loaded materials
            const material = materials.find(m => m.id === materialId);
            if (material) {
                const totalCost = material.cost_per_unit * quantity;
                materialsData.push({
                    material_id: materialId,
                    name: material.name,
                    quantity: quantity,
                    cost_per_unit: material.cost_per_unit,
                    total_cost: totalCost
                });
            }
        }
    });

    return materialsData;
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const materialsData = getMaterialsFromForm();
    if (materialsData.length === 0) {
        showToast('Please add at least one material', 'error');
        return;
    }

    const size = document.getElementById('size').value;
    const sellPrice = parseFloat(document.getElementById('sellPrice').value);

    // Calculate total cost and total stems
    const totalCost = materialsData.reduce((sum, m) => sum + m.total_cost, 0);
    const totalStems = materialsData.reduce((sum, m) => {
        const material = materials.find(mat => mat.id === m.material_id);
        // Only count stems from flower materials
        return sum + (material && material.type === 'Flower' ? m.quantity : 0);
    }, 0);

    // Get calculated price from pricing preview
    const calcPrice = parseFloat(document.getElementById('previewCalcPrice').textContent);
    const profit = sellPrice - totalCost;
    const profitMargin = sellPrice > 0 ? (profit / sellPrice * 100) : 0;

    const formData = {
        name: document.getElementById('name').value.trim(),
        size: size,
        description: document.getElementById('description').value.trim() || null,
        image_url: document.getElementById('imageUrl').value.trim() || null,
        materials: materialsData,
        total_cost: totalCost,
        calculated_sale_price: calcPrice || sellPrice,
        sell_price: sellPrice,
        profit: profit,
        profit_margin: profitMargin,
        total_stems: Math.floor(totalStems)
    };

    try {
        if (currentBouquetId) {
            await API.bouquets.update(currentBouquetId, formData);
            showToast('Bouquet updated successfully', 'success');
        } else {
            await API.bouquets.create(formData);
            showToast('Bouquet created successfully', 'success');
        }

        modal.close();
        await loadBouquets();
    } catch (error) {
        showToast('Failed to save bouquet: ' + error.message, 'error');
    }
}

// View bouquet details
function viewBouquet(id) {
    const bouquet = bouquets.find(b => b.id === id);
    if (!bouquet) return;

    const viewModal = new Modal('viewBouquetModal');

    document.getElementById('viewModalTitle').textContent = bouquet.name;

    const materialsList = bouquet.materials.map(m => `
        <tr>
            <td>${m.name}</td>
            <td>${m.quantity} ${materials.find(mat => mat.id === m.material_id)?.unit || 'units'}</td>
            <td>${formatCurrency(m.cost_per_unit)}</td>
            <td>${formatCurrency(m.total_cost)}</td>
        </tr>
    `).join('');

    const content = `
        <div style="display: grid; gap: var(--spacing-lg);">
            <div>
                <h4 style="margin: 0 0 var(--spacing-sm) 0; color: var(--text-secondary); font-size: 0.875rem; text-transform: uppercase;">Details</h4>
                <p style="margin: var(--spacing-xs) 0;"><strong>Size:</strong> ${bouquet.size.charAt(0).toUpperCase() + bouquet.size.slice(1)}</p>
                ${bouquet.description ? `<p style="margin: var(--spacing-xs) 0;"><strong>Description:</strong> ${bouquet.description}</p>` : ''}
                <p style="margin: var(--spacing-xs) 0;"><strong>Total Stems:</strong> ${bouquet.total_stems || 'N/A'}</p>
            </div>

            <div>
                <h4 style="margin: 0 0 var(--spacing-sm) 0; color: var(--text-secondary); font-size: 0.875rem; text-transform: uppercase;">Materials</h4>
                <table class="data-table" style="font-size: 0.875rem;">
                    <thead>
                        <tr>
                            <th>Material</th>
                            <th>Quantity</th>
                            <th>Cost/Unit</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${materialsList}
                    </tbody>
                </table>
            </div>

            <div>
                <h4 style="margin: 0 0 var(--spacing-sm) 0; color: var(--text-secondary); font-size: 0.875rem; text-transform: uppercase;">Pricing</h4>
                <div style="display: grid; grid-template-columns: repeat(2, 1fr); gap: var(--spacing-md);">
                    <div>
                        <p style="margin: var(--spacing-xs) 0; color: var(--text-secondary); font-size: 0.75rem;">Total Cost</p>
                        <p style="margin: 0; font-size: 1.25rem; font-weight: 600;">${formatCurrency(bouquet.total_cost)}</p>
                    </div>
                    <div>
                        <p style="margin: var(--spacing-xs) 0; color: var(--text-secondary); font-size: 0.75rem;">Calculated Price</p>
                        <p style="margin: 0; font-size: 1.25rem; font-weight: 600;">${formatCurrency(bouquet.calculated_sale_price)}</p>
                    </div>
                    <div>
                        <p style="margin: var(--spacing-xs) 0; color: var(--text-secondary); font-size: 0.75rem;">Sell Price</p>
                        <p style="margin: 0; font-size: 1.5rem; font-weight: 700; color: var(--primary-color);">${formatCurrency(bouquet.sell_price)}</p>
                    </div>
                    <div>
                        <p style="margin: var(--spacing-xs) 0; color: var(--text-secondary); font-size: 0.75rem;">Profit</p>
                        <p style="margin: 0; font-size: 1.25rem; font-weight: 600; color: var(--success-color);">${formatCurrency(bouquet.profit)} (${bouquet.profit_margin.toFixed(1)}%)</p>
                    </div>
                </div>
            </div>
        </div>
    `;

    document.getElementById('viewBouquetContent').innerHTML = content;
    viewModal.open();
}

// Edit bouquet
async function editBouquet(id) {
    const bouquet = bouquets.find(b => b.id === id);
    if (!bouquet) return;

    currentBouquetId = id;
    materialRowCounter = 0;
    modal.setTitle('Edit Bouquet');

    // Populate form
    document.getElementById('name').value = bouquet.name;
    document.getElementById('size').value = bouquet.size;
    document.getElementById('description').value = bouquet.description || '';
    document.getElementById('imageUrl').value = bouquet.image_url || '';
    document.getElementById('sellPrice').value = bouquet.sell_price;

    // Populate materials
    const container = document.getElementById('materialsContainer');
    container.innerHTML = '';
    bouquet.materials.forEach(material => {
        addMaterialRow(material);
    });

    await updatePricingPreview();
    modal.open();
}

// Delete bouquet
async function deleteBouquet(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await API.bouquets.delete(id);
        showToast('Bouquet deleted successfully', 'success');
        await loadBouquets();
    } catch (error) {
        showToast('Failed to delete bouquet: ' + error.message, 'error');
    }
}

// Make functions globally accessible for onclick handlers
window.viewBouquet = viewBouquet;
window.editBouquet = editBouquet;
window.deleteBouquet = deleteBouquet;
// removeMaterialRow is already defined as window.removeMaterialRow on line 148
