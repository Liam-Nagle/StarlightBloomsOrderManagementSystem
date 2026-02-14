"""Material inventory management service"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from typing import List, Dict
from datetime import datetime


async def update_stock(
    material_id: str,
    quantity_change: int,
    db: AsyncIOMotorDatabase
) -> Dict:
    """
    Update material stock level

    Args:
        material_id: Material ID
        quantity_change: Amount to add (positive) or subtract (negative)
        db: MongoDB database instance

    Returns:
        Dict with updated material or error
    """
    material = await db.materials.find_one({"_id": ObjectId(material_id)})

    if not material:
        return {"error": "Material not found"}

    # Calculate new stock level
    current_stock = material.get("current_stock", 0)
    new_stock = current_stock + quantity_change

    if new_stock < 0:
        return {"error": "Insufficient stock"}

    # Update stock
    result = await db.materials.update_one(
        {"_id": ObjectId(material_id)},
        {
            "$set": {
                "current_stock": new_stock,
                "last_updated": datetime.utcnow()
            }
        }
    )

    if result.modified_count > 0:
        updated_material = await db.materials.find_one({"_id": ObjectId(material_id)})
        return {"success": True, "material": updated_material}
    else:
        return {"error": "Failed to update stock"}


async def check_low_stock(db: AsyncIOMotorDatabase) -> List[Dict]:
    """
    Get list of materials with low stock levels using individual thresholds

    Args:
        db: MongoDB database instance

    Returns:
        List of materials below their threshold
    """
    low_stock_materials = []

    # Get all materials and check against their individual thresholds
    cursor = db.materials.find({"current_stock": {"$ne": None}})

    async for material in cursor:
        current_stock = material.get("current_stock", 0)
        threshold = material.get("low_stock_threshold", 10)

        if current_stock <= threshold:
            low_stock_materials.append({
                "id": str(material["_id"]),
                "name": material["name"],
                "current_stock": round(current_stock, 2),
                "low_stock_threshold": threshold,
                "type": material["type"]
            })

    return low_stock_materials


async def get_material_usage(
    material_id: str,
    db: AsyncIOMotorDatabase
) -> Dict:
    """
    Get information about where a material is used

    Args:
        material_id: Material ID
        db: MongoDB database instance

    Returns:
        Dict with usage information
    """
    # Find bouquets using this material
    bouquets = []
    cursor = db.bouquets.find({"materials.material_id": material_id})

    async for bouquet in cursor:
        # Find the material in the bouquet
        for mat in bouquet.get("materials", []):
            if mat["material_id"] == material_id:
                bouquets.append({
                    "bouquet_id": str(bouquet["_id"]),
                    "bouquet_name": bouquet["name"],
                    "size": bouquet["size"],
                    "quantity_used": mat["quantity"]
                })
                break

    return {
        "material_id": material_id,
        "used_in_bouquets": bouquets,
        "total_bouquets": len(bouquets)
    }


async def bulk_stock_update(
    updates: List[Dict],
    db: AsyncIOMotorDatabase
) -> Dict:
    """
    Update stock for multiple materials at once

    Args:
        updates: List of dicts with 'material_id' and 'quantity_change'
        db: MongoDB database instance

    Returns:
        Dict with results
    """
    results = {
        "success": [],
        "errors": []
    }

    for update in updates:
        material_id = update.get("material_id")
        quantity_change = update.get("quantity_change", 0)

        result = await update_stock(material_id, quantity_change, db)

        if result.get("error"):
            results["errors"].append({
                "material_id": material_id,
                "error": result["error"]
            })
        else:
            results["success"].append({
                "material_id": material_id,
                "new_stock": result["material"]["current_stock"]
            })

    return results
