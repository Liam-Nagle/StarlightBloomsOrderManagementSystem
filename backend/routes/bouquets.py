"""Bouquets API routes"""
from fastapi import APIRouter, HTTPException, Query
from typing import List, Optional
from bson import ObjectId
from datetime import datetime

from backend.models.bouquet import (
    BouquetCreate,
    BouquetUpdate,
    BouquetResponse,
    BouquetSize,
    PriceCalculationRequest,
    PriceCalculationResponse
)
from backend.database import get_database
from backend.services.bouquet_service import (
    calculate_bouquet_pricing,
    validate_materials,
    get_bouquet_with_material_details
)

router = APIRouter()


@router.post("/", response_model=dict, status_code=201)
async def create_bouquet(bouquet: BouquetCreate):
    """Create a new bouquet"""
    db = get_database()

    # Validate materials exist (don't check stock for bouquet recipes)
    materials_for_validation = [
        {"material_id": m.material_id, "quantity": m.quantity}
        for m in bouquet.materials
    ]

    validation = await validate_materials(materials_for_validation, db, check_stock=False)

    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail={"message": "Material validation failed", "errors": validation["errors"]}
        )

    bouquet_dict = bouquet.model_dump()
    bouquet_dict["created_at"] = datetime.utcnow()

    result = await db.bouquets.insert_one(bouquet_dict)

    if result.inserted_id:
        created_bouquet = await db.bouquets.find_one({"_id": result.inserted_id})
        created_bouquet["_id"] = str(created_bouquet["_id"])
        return {
            "message": "Bouquet created successfully",
            "bouquet": created_bouquet
        }

    raise HTTPException(status_code=500, detail="Failed to create bouquet")


@router.get("/", response_model=List[dict])
async def get_bouquets(
    size: Optional[BouquetSize] = Query(None, description="Filter by bouquet size")
):
    """Get all bouquets with optional size filter and recalculated pricing"""
    db = get_database()

    query = {}
    if size:
        query["size"] = size

    bouquets = []
    cursor = db.bouquets.find(query).sort("name", 1)

    async for bouquet in cursor:
        # Recalculate pricing with current material costs
        materials_for_calc = [
            {"material_id": m["material_id"], "quantity": m["quantity"]}
            for m in bouquet.get("materials", [])
        ]

        if materials_for_calc:
            current_pricing = await calculate_bouquet_pricing(
                materials_list=materials_for_calc,
                size=bouquet["size"],
                db=db
            )
            # Update bouquet with current calculated pricing
            bouquet["total_cost"] = current_pricing["total_cost"]
            bouquet["calculated_sale_price"] = current_pricing["calculated_sale_price"]
            # Recalculate profit based on actual sell price
            bouquet["profit"] = bouquet["sell_price"] - current_pricing["total_cost"]
            bouquet["profit_margin"] = (
                (bouquet["profit"] / bouquet["sell_price"] * 100)
                if bouquet["sell_price"] > 0 else 0
            )

        bouquet["_id"] = str(bouquet["_id"])
        bouquet["id"] = bouquet["_id"]  # Add id field for frontend compatibility
        bouquets.append(bouquet)

    return bouquets


@router.get("/{bouquet_id}", response_model=dict)
async def get_bouquet(bouquet_id: str):
    """Get a specific bouquet by ID with enriched material details"""
    db = get_database()

    bouquet = await get_bouquet_with_material_details(bouquet_id, db)

    if not bouquet:
        raise HTTPException(status_code=404, detail="Bouquet not found")

    bouquet["_id"] = str(bouquet["_id"])
    return bouquet


@router.put("/{bouquet_id}", response_model=dict)
async def update_bouquet(bouquet_id: str, bouquet_update: BouquetUpdate):
    """Update a bouquet"""
    db = get_database()

    # Remove None values
    update_data = {k: v for k, v in bouquet_update.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # If materials are being updated, validate they exist (don't check stock for bouquet recipes)
    if "materials" in update_data:
        materials_for_validation = [
            {"material_id": m["material_id"], "quantity": m["quantity"]}
            for m in update_data["materials"]
        ]

        validation = await validate_materials(materials_for_validation, db, check_stock=False)

        if not validation["valid"]:
            raise HTTPException(
                status_code=400,
                detail={"message": "Material validation failed", "errors": validation["errors"]}
            )

    try:
        result = await db.bouquets.update_one(
            {"_id": ObjectId(bouquet_id)},
            {"$set": update_data}
        )
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid bouquet ID")

    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Bouquet not found")

    updated_bouquet = await db.bouquets.find_one({"_id": ObjectId(bouquet_id)})
    updated_bouquet["_id"] = str(updated_bouquet["_id"])

    return {
        "message": "Bouquet updated successfully",
        "bouquet": updated_bouquet
    }


@router.delete("/{bouquet_id}", response_model=dict)
async def delete_bouquet(bouquet_id: str):
    """Delete a bouquet"""
    db = get_database()

    # Check if bouquet is used in any pending orders
    bouquet = await db.bouquets.find_one({"_id": ObjectId(bouquet_id)})

    if not bouquet:
        raise HTTPException(status_code=404, detail="Bouquet not found")

    # Check for orders using this bouquet
    bouquet_name = bouquet["name"]
    bouquet_size = bouquet["size"]

    orders_count = await db.orders.count_documents({
        "bouquet_type": {"$regex": bouquet_name, "$options": "i"},
        "size": bouquet_size,
        "status": {"$in": ["pending", "completed"]}
    })

    if orders_count > 0:
        raise HTTPException(
            status_code=400,
            detail=f"Cannot delete bouquet. It is referenced in {orders_count} order(s)"
        )

    try:
        result = await db.bouquets.delete_one({"_id": ObjectId(bouquet_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid bouquet ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Bouquet not found")

    return {"message": "Bouquet deleted successfully"}


@router.post("/calculate-price", response_model=PriceCalculationResponse)
async def calculate_price(request: PriceCalculationRequest):
    """Calculate pricing for a bouquet based on materials and size"""
    db = get_database()

    # Validate materials exist (don't check stock for price calculation)
    validation = await validate_materials(request.materials, db, check_stock=False)

    if not validation["valid"]:
        raise HTTPException(
            status_code=400,
            detail={"message": "Material validation failed", "errors": validation["errors"]}
        )

    # Calculate pricing
    pricing = await calculate_bouquet_pricing(
        materials_list=request.materials,
        size=request.size,
        db=db
    )

    return PriceCalculationResponse(**pricing)
