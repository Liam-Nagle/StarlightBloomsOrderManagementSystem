"""Materials API routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from backend.models.material import (
    MaterialCreate,
    MaterialUpdate,
    MaterialResponse,
    MaterialType
)
from backend.database import get_database
from backend.services.material_service import (
    update_stock,
    check_low_stock,
    get_material_usage
)

router = APIRouter()


@router.post("/", response_model=dict, status_code=201)
async def create_material(material: MaterialCreate):
    """Create a new material"""
    db = get_database()

    material_dict = material.model_dump()
    material_dict["last_updated"] = datetime.utcnow()

    result = await db.materials.insert_one(material_dict)

    if result.inserted_id:
        created_material = await db.materials.find_one({"_id": result.inserted_id})
        created_material["_id"] = str(created_material["_id"])
        return {
            "message": "Material created successfully",
            "material": created_material
        }

    raise HTTPException(status_code=500, detail="Failed to create material")


@router.get("/", response_model=List[dict])
async def get_materials(
    type: Optional[MaterialType] = Query(None, description="Filter by material type")
):
    """Get all materials with optional type filter"""
    db = get_database()

    query = {}
    if type:
        query["type"] = type

    materials = []
    cursor = db.materials.find(query).sort("name", 1)

    async for material in cursor:
        material["_id"] = str(material["_id"])
        material["id"] = material["_id"]  # Add id field for frontend compatibility
        materials.append(material)

    return materials


@router.get("/low-stock", response_model=List[dict])
async def get_low_stock_materials():
    """Get materials with low stock levels"""
    db = get_database()
    low_stock = await check_low_stock(db)
    return low_stock


@router.get("/{material_id}", response_model=dict)
async def get_material(material_id: str):
    """Get a specific material by ID"""
    db = get_database()

    try:
        material = await db.materials.find_one({"_id": ObjectId(material_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    if not material:
        raise HTTPException(status_code=404, detail="Material not found")

    material["_id"] = str(material["_id"])
    return material


@router.put("/{material_id}", response_model=dict)
async def update_material(material_id: str, material_update: MaterialUpdate):
    """Update a material"""
    db = get_database()

    # Remove None values
    update_data = {k: v for k, v in material_update.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    update_data["last_updated"] = datetime.utcnow()

    try:
        result = await db.materials.update_one(
            {"_id": ObjectId(material_id)},
            {"$set": update_data}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")

    updated_material = await db.materials.find_one({"_id": ObjectId(material_id)})
    updated_material["_id"] = str(updated_material["_id"])

    return {
        "message": "Material updated successfully",
        "material": updated_material
    }


@router.delete("/{material_id}", response_model=dict)
async def delete_material(material_id: str):
    """Delete a material"""
    db = get_database()

    # Check if material is used in any bouquets
    usage = await get_material_usage(material_id, db)

    if usage["total_bouquets"] > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete material. It is used in {usage['total_bouquets']} bouquet(s)"
        )

    try:
        result = await db.materials.delete_one({"_id": ObjectId(material_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid material ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Material not found")

    return {"message": "Material deleted successfully"}


@router.put("/{material_id}/stock", response_model=dict)
async def update_material_stock(
    material_id: str,
    quantity_change: int = Query(..., description="Amount to add (positive) or subtract (negative)")
):
    """Update material stock level"""
    db = get_database()

    result = await update_stock(material_id, quantity_change, db)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    result["material"]["_id"] = str(result["material"]["_id"])

    return {
        "message": "Stock updated successfully",
        "material": result["material"]
    }


@router.get("/{material_id}/usage", response_model=dict)
async def get_material_usage_info(material_id: str):
    """Get information about where a material is used"""
    db = get_database()

    usage = await get_material_usage(material_id, db)

    return usage
