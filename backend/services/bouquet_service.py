"""Bouquet pricing and calculation service"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import List, Dict


# Labor costs by bouquet size
LABOUR_COSTS = {
    "small": 10.0,
    "medium": 15.0,
    "large": 20.0
}

# Markup multipliers
FLOWER_MARKUP = 1.8
HARD_MATERIAL_MARKUP = 2.0


async def calculate_bouquet_pricing(
    materials_list: List[Dict],
    size: str,
    db: AsyncIOMotorDatabase
) -> Dict[str, float]:
    """
    Calculate bouquet pricing based on materials and size

    Formula:
    - Flower materials: cost * 1.8
    - Hard materials: cost * 2.0
    - Add labour: £10 (small), £15 (medium), £20 (large)

    Args:
        materials_list: List of dicts with 'material_id' and 'quantity'
        size: Bouquet size ('small', 'medium', or 'large')
        db: MongoDB database instance

    Returns:
        Dict with totalCost, calculatedSalePrice, profit, profitMargin
    """
    flower_cost = 0.0
    hard_material_cost = 0.0
    total_cost = 0.0

    # Calculate costs by material type
    for item in materials_list:
        material_id = item.get("material_id")
        quantity = item.get("quantity", 0)

        # Fetch material from database
        material = await db.materials.find_one({"_id": ObjectId(material_id)})

        if not material:
            continue

        item_cost = material["cost_per_unit"] * quantity

        if material["type"] == "Flower":
            flower_cost += item_cost
        else:  # Hard Material
            hard_material_cost += item_cost

        total_cost += item_cost

    # Apply markup and add labour
    labour = LABOUR_COSTS.get(size.lower(), 15.0)
    calculated_sale_price = (
        flower_cost * FLOWER_MARKUP +
        hard_material_cost * HARD_MATERIAL_MARKUP +
        labour
    )

    # Calculate profit metrics
    profit = calculated_sale_price - total_cost
    profit_margin = (profit / calculated_sale_price * 100) if calculated_sale_price > 0 else 0

    return {
        "total_cost": round(total_cost, 2),
        "calculated_sale_price": round(calculated_sale_price, 2),
        "profit": round(profit, 2),
        "profit_margin": round(profit_margin, 2)
    }


async def validate_materials(
    materials_list: List[Dict],
    db: AsyncIOMotorDatabase
) -> Dict[str, any]:
    """
    Validate that all materials exist and have sufficient stock (if tracked)

    Args:
        materials_list: List of dicts with 'material_id' and 'quantity'
        db: MongoDB database instance

    Returns:
        Dict with 'valid' (bool) and 'errors' (list)
    """
    errors = []

    for item in materials_list:
        material_id = item.get("material_id")
        quantity = item.get("quantity", 0)

        if not material_id:
            errors.append("Material ID is required for all materials")
            continue

        # Check if material exists
        try:
            material = await db.materials.find_one({"_id": ObjectId(material_id)})
        except Exception as e:
            errors.append(f"Invalid material ID: {material_id}")
            continue

        if not material:
            errors.append(f"Material not found: {material_id}")
            continue

        # Check stock if tracked
        if material.get("current_stock") is not None:
            if material["current_stock"] < quantity:
                errors.append(
                    f"Insufficient stock for {material['name']}: "
                    f"need {quantity}, have {material['current_stock']}"
                )

    return {
        "valid": len(errors) == 0,
        "errors": errors
    }


async def get_bouquet_with_material_details(
    bouquet_id: str,
    db: AsyncIOMotorDatabase
) -> Dict:
    """
    Get bouquet with full material details enriched from materials collection

    Args:
        bouquet_id: Bouquet ID
        db: MongoDB database instance

    Returns:
        Bouquet dict with enriched material information
    """
    bouquet = await db.bouquets.find_one({"_id": ObjectId(bouquet_id)})

    if not bouquet:
        return None

    # Enrich materials with current data
    for material_item in bouquet.get("materials", []):
        material_id = material_item.get("material_id")
        current_material = await db.materials.find_one({"_id": ObjectId(material_id)})

        if current_material:
            material_item["current_cost_per_unit"] = current_material["cost_per_unit"]
            material_item["current_stock"] = current_material.get("current_stock")

    return bouquet
