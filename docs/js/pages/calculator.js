/**
 * Bouquet Calculator Page
 * Allows ad-hoc pricing calculations without saving to the database.
 */

let calcMaterials = [];
let calcMaterialRowCounter = 0;

document.addEventListener('DOMContentLoaded', async () => {
    await loadCalcMaterials();
    setupCalcEventListeners();
    addCalcMaterialRow();
});

async function loadCalcMaterials() {
    try {
        calcMaterials = await API.materials.getAll();
    } catch (error) {
        showToast('Failed to load materials: ' + error.message, 'error');
    }
}

function setupCalcEventListeners() {
    document.getElementById('calcSize')?.addEventListener('change', updateCalcPricingPreview);
    document.getElementById('addCalcMaterialBtn')?.addEventListener('click', () => addCalcMaterialRow());
    document.getElementById('clearBtn')?.addEventListener('click', clearCalculator);
}

function addCalcMaterialRow(materialData = null) {
    const container = document.getElementById('calcMaterialsContainer');
    const rowId = `calc-material-row-${calcMaterialRowCounter++}`;

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
            <input type="number" class="material-quantity" step="0.01" min="0.01" value="${materialData?.quantity || 1}">
        </div>
        <button type="button" class="btn btn-danger" onclick="removeCalcMaterialRow('${rowId}')" style="height: 38px;">✕</button>
    `;

    container.appendChild(row);

    const options = calcMaterials.map(m => ({
        value: m.id,
        label: m.name,
        meta: `${formatCurrency(m.cost_per_unit)}/${m.unit}`
    }));

    const selectContainer = row.querySelector('.material-select-container');
    const searchableSelect = new SearchableSelect(selectContainer, options, () => updateCalcPricingPreview());

    if (materialData?.material_id) {
        searchableSelect.setValue(materialData.material_id);
    }

    row.searchableSelect = searchableSelect;
    row.querySelector('.material-quantity').addEventListener('input', updateCalcPricingPreview);
}

window.removeCalcMaterialRow = function(rowId) {
    document.getElementById(rowId)?.remove();
    updateCalcPricingPreview();
};

function getCalcMaterialsFromForm() {
    const rows = document.querySelectorAll('#calcMaterialsContainer .form-row');
    const result = [];

    rows.forEach(row => {
        const materialId = row.searchableSelect?.getValue();
        const quantity = parseFloat(row.querySelector('.material-quantity').value);

        if (materialId && quantity > 0) {
            const material = calcMaterials.find(m => m.id === materialId);
            if (material) {
                result.push({
                    material_id: materialId,
                    name: material.name,
                    quantity,
                    cost_per_unit: material.cost_per_unit,
                    total_cost: material.cost_per_unit * quantity
                });
            }
        }
    });

    return result;
}

async function updateCalcPricingPreview() {
    const size = document.getElementById('calcSize').value;
    const note = document.getElementById('calcPreviewNote');

    if (!size) {
        note.textContent = 'Select a size and add materials to see pricing.';
        return;
    }

    const materialsData = getCalcMaterialsFromForm();
    if (materialsData.length === 0) {
        note.textContent = 'Add at least one material to see pricing.';
        return;
    }

    try {
        const pricing = await API.bouquets.calculatePrice({ materials: materialsData, size });

        document.getElementById('calcTotalCost').textContent = pricing.total_cost.toFixed(2);
        document.getElementById('calcSalePrice').textContent = pricing.calculated_sale_price.toFixed(2);
        document.getElementById('calcProfit').textContent = pricing.profit.toFixed(2);
        document.getElementById('calcMargin').textContent = pricing.profit_margin.toFixed(1);
        note.textContent = '';
    } catch (error) {
        console.error('Failed to calculate pricing:', error);
    }
}

function clearCalculator() {
    document.getElementById('calcSize').value = '';
    document.getElementById('calcMaterialsContainer').innerHTML = '';
    calcMaterialRowCounter = 0;
    document.getElementById('calcTotalCost').textContent = '0.00';
    document.getElementById('calcSalePrice').textContent = '0.00';
    document.getElementById('calcProfit').textContent = '0.00';
    document.getElementById('calcMargin').textContent = '0.0';
    document.getElementById('calcPreviewNote').textContent = 'Select a size and add materials to see pricing.';
    addCalcMaterialRow();
}
