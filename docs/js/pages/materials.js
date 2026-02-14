/**
 * Materials Page Logic
 * Handles material inventory CRUD operations
 */

let materials = [];
let currentMaterialId = null;
let modal = null;

// Initialize page
document.addEventListener('DOMContentLoaded', async () => {
    modal = new Modal('materialModal');
    await loadMaterials();
    setupEventListeners();
});

// Load materials from API
async function loadMaterials() {
    try {
        const type = document.getElementById('typeFilter')?.value || null;
        materials = await API.materials.getAll(type);
        renderMaterialsTable();
    } catch (error) {
        showToast('Failed to load materials: ' + error.message, 'error');
    }
}

// Render materials table
function renderMaterialsTable() {
    const tbody = document.getElementById('materialsTableBody');
    const emptyState = document.getElementById('emptyState');
    const searchQuery = document.getElementById('searchInput')?.value.toLowerCase() || '';

    // Filter materials by search query
    let filteredMaterials = materials;
    if (searchQuery) {
        filteredMaterials = materials.filter(m =>
            m.name.toLowerCase().includes(searchQuery) ||
            m.supplier?.toLowerCase().includes(searchQuery) ||
            m.product_number?.toLowerCase().includes(searchQuery)
        );
    }

    if (filteredMaterials.length === 0) {
        tbody.innerHTML = '';
        emptyState.style.display = 'block';
        return;
    }

    emptyState.style.display = 'none';
    tbody.innerHTML = filteredMaterials.map(material => {
        // Format stock to 2 decimal places
        const stockValue = parseFloat(material.current_stock || 0).toFixed(2);
        const lowStockThreshold = material.low_stock_threshold || 10;
        const stockBadge = material.current_stock <= lowStockThreshold
            ? `<span class="badge badge-warning">${stockValue}</span>`
            : stockValue;

        return `
            <tr>
                <td><strong>${material.name}</strong></td>
                <td><span class="badge badge-${material.type === 'Flower' ? 'success' : 'info'}">${material.type}</span></td>
                <td>${material.supplier || '-'}</td>
                <td>${material.product_number || '-'}</td>
                <td>${formatCurrency(material.cost_per_unit)}</td>
                <td>${material.unit}</td>
                <td>${stockBadge}</td>
                <td>
                    <div class="table-actions">
                        <button class="action-btn action-btn-edit" onclick="editMaterial('${material.id}')">Edit</button>
                        <button class="action-btn action-btn-delete" onclick="deleteMaterial('${material.id}', '${material.name}')">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join('');
}

// Setup event listeners
function setupEventListeners() {
    document.getElementById('addMaterialBtn')?.addEventListener('click', () => {
        currentMaterialId = null;
        modal.setTitle('Add Material');
        modal.resetForm();
        modal.open();
    });

    document.getElementById('cancelBtn')?.addEventListener('click', () => {
        modal.close();
    });

    document.getElementById('materialForm')?.addEventListener('submit', handleFormSubmit);

    document.getElementById('searchInput')?.addEventListener('input', renderMaterialsTable);
    document.getElementById('typeFilter')?.addEventListener('change', loadMaterials);
}

// Handle form submission
async function handleFormSubmit(e) {
    e.preventDefault();

    const formData = {
        name: document.getElementById('name').value.trim(),
        type: document.getElementById('type').value,
        supplier: document.getElementById('supplier').value.trim() || null,
        product_number: document.getElementById('productNumber').value.trim() || null,
        cost_per_unit: parseFloat(document.getElementById('costPerUnit').value),
        unit: document.getElementById('unit').value,
        current_stock: parseFloat(document.getElementById('currentStock').value) || 0,
        low_stock_threshold: parseFloat(document.getElementById('lowStockThreshold').value) || 10
    };

    try {
        if (currentMaterialId) {
            await API.materials.update(currentMaterialId, formData);
            showToast('Material updated successfully', 'success');
        } else {
            await API.materials.create(formData);
            showToast('Material created successfully', 'success');
        }

        modal.close();
        await loadMaterials();
    } catch (error) {
        showToast('Failed to save material: ' + error.message, 'error');
    }
}

// Edit material
async function editMaterial(id) {
    const material = materials.find(m => m.id === id);
    if (!material) return;

    currentMaterialId = id;
    modal.setTitle('Edit Material');

    // Populate form
    document.getElementById('name').value = material.name;
    document.getElementById('type').value = material.type;
    document.getElementById('supplier').value = material.supplier || '';
    document.getElementById('productNumber').value = material.product_number || '';
    document.getElementById('costPerUnit').value = material.cost_per_unit;
    document.getElementById('unit').value = material.unit;
    document.getElementById('currentStock').value = parseFloat(material.current_stock || 0).toFixed(2);
    document.getElementById('lowStockThreshold').value = parseFloat(material.low_stock_threshold || 10).toFixed(2);

    modal.open();
}

// Delete material
async function deleteMaterial(id, name) {
    if (!confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
        return;
    }

    try {
        await API.materials.delete(id);
        showToast('Material deleted successfully', 'success');
        await loadMaterials();
    } catch (error) {
        showToast('Failed to delete material: ' + error.message, 'error');
    }
}

// Make functions globally accessible for onclick handlers
window.editMaterial = editMaterial;
window.deleteMaterial = deleteMaterial;
