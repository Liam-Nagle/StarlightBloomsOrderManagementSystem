"""Order management service"""
from motor.motor_asyncio import AsyncIOMotorDatabase
from bson import ObjectId
from datetime import datetime, date
from typing import List, Dict, Optional


async def create_order_with_validation(
    order_data: Dict,
    order_number: str,
    db: AsyncIOMotorDatabase
) -> Dict:
    """
    Create order with validation

    Args:
        order_data: Order data dict
        order_number: Generated order number
        db: MongoDB database instance

    Returns:
        Dict with created order or error
    """
    # Add order number and timestamp
    order_doc = {
        **order_data,
        "order_number": order_number,
        "created_at": datetime.utcnow()
    }

    # Convert date to datetime for MongoDB compatibility
    if isinstance(order_doc.get("date"), str):
        try:
            # Parse date string and convert to datetime (start of day)
            parsed_date = datetime.fromisoformat(order_doc["date"])
            if not isinstance(parsed_date, datetime):
                # If it's just a date, convert to datetime at midnight
                parsed_date = datetime.combine(parsed_date, datetime.min.time())
            order_doc["date"] = parsed_date
        except ValueError:
            return {"error": "Invalid date format"}
    elif isinstance(order_doc.get("date"), date) and not isinstance(order_doc.get("date"), datetime):
        # Convert date object to datetime object
        order_doc["date"] = datetime.combine(order_doc["date"], datetime.min.time())

    # Insert order
    result = await db.orders.insert_one(order_doc)

    if result.inserted_id:
        created_order = await db.orders.find_one({"_id": result.inserted_id})
        return {"success": True, "order": created_order}
    else:
        return {"error": "Failed to create order"}


async def get_orders_with_filters(
    db: AsyncIOMotorDatabase,
    status: Optional[str] = None,
    start_date: Optional[date] = None,
    end_date: Optional[date] = None,
    customer_name: Optional[str] = None,
    limit: int = 100,
    skip: int = 0
) -> List[Dict]:
    """
    Get orders with optional filters

    Args:
        db: MongoDB database instance
        status: Filter by status (pending/completed/cancelled)
        start_date: Filter by date range (start)
        end_date: Filter by date range (end)
        customer_name: Filter by customer name (partial match)
        limit: Maximum number of results
        skip: Number of results to skip (pagination)

    Returns:
        List of orders
    """
    query = {}

    # Status filter
    if status:
        query["status"] = status

    # Date range filter
    if start_date or end_date:
        date_query = {}
        if start_date:
            # Convert date to datetime for MongoDB compatibility
            date_query["$gte"] = datetime.combine(start_date, datetime.min.time())
        if end_date:
            # Convert date to datetime for MongoDB compatibility (end of day)
            date_query["$lte"] = datetime.combine(end_date, datetime.max.time())
        query["date"] = date_query

    # Customer name filter (case-insensitive partial match)
    if customer_name:
        query["customer_name"] = {"$regex": customer_name, "$options": "i"}

    # Execute query
    orders = []
    cursor = db.orders.find(query).sort("created_at", -1).skip(skip).limit(limit)

    async for order in cursor:
        # Convert ObjectId to string
        order["_id"] = str(order["_id"])
        order["id"] = order["_id"]  # Add id field for frontend compatibility
        orders.append(order)

    return orders


async def search_orders(
    search_term: str,
    db: AsyncIOMotorDatabase
) -> List[Dict]:
    """
    Search orders by customer name, order number, or delivery address

    Args:
        search_term: Search string
        db: MongoDB database instance

    Returns:
        List of matching orders
    """
    query = {
        "$or": [
            {"customer_name": {"$regex": search_term, "$options": "i"}},
            {"order_number": {"$regex": search_term, "$options": "i"}},
            {"delivery_address": {"$regex": search_term, "$options": "i"}},
            {"bouquet_type": {"$regex": search_term, "$options": "i"}}
        ]
    }

    orders = []
    cursor = db.orders.find(query).sort("created_at", -1)

    async for order in cursor:
        order["_id"] = str(order["_id"])
        order["id"] = order["_id"]  # Add id field for frontend compatibility
        orders.append(order)

    return orders


async def update_order_status(
    order_id: str,
    new_status: str,
    db: AsyncIOMotorDatabase
) -> Dict:
    """
    Update order status with validation

    Args:
        order_id: Order ID
        new_status: New status value
        db: MongoDB database instance

    Returns:
        Dict with updated order or error
    """
    valid_statuses = ["pending", "completed", "cancelled"]

    if new_status not in valid_statuses:
        return {"error": f"Invalid status. Must be one of: {valid_statuses}"}

    result = await db.orders.update_one(
        {"_id": ObjectId(order_id)},
        {"$set": {"status": new_status}}
    )

    if result.modified_count > 0:
        updated_order = await db.orders.find_one({"_id": ObjectId(order_id)})
        updated_order["_id"] = str(updated_order["_id"])
        updated_order["id"] = updated_order["_id"]  # Add id field for frontend compatibility
        return {"success": True, "order": updated_order}
    else:
        return {"error": "Order not found or status unchanged"}


async def get_today_orders(db: AsyncIOMotorDatabase) -> List[Dict]:
    """
    Get orders for today's date

    Args:
        db: MongoDB database instance

    Returns:
        List of today's orders
    """
    today = date.today()

    return await get_orders_with_filters(
        db=db,
        start_date=today,
        end_date=today
    )


async def get_pending_orders(db: AsyncIOMotorDatabase) -> List[Dict]:
    """
    Get all pending orders

    Args:
        db: MongoDB database instance

    Returns:
        List of pending orders
    """
    return await get_orders_with_filters(
        db=db,
        status="pending"
    )


async def calculate_order_total(
    bouquet_id: str,
    quantity: int,
    db: AsyncIOMotorDatabase
) -> float:
    """
    Calculate total price for an order based on bouquet

    Args:
        bouquet_id: Bouquet ID
        quantity: Number of bouquets
        db: MongoDB database instance

    Returns:
        Total price
    """
    bouquet = await db.bouquets.find_one({"_id": ObjectId(bouquet_id)})

    if not bouquet:
        return 0.0

    # Use sell_price if available, otherwise use calculated_sale_price
    price = bouquet.get("sell_price", bouquet.get("calculated_sale_price", 0))

    return round(price * quantity, 2)


async def _get_bouquet_cost(bouquet_type: str, size: str, quantity: int, db) -> float:
    """Helper to calculate material cost for a single bouquet line item"""
    bouquet = await db.bouquets.find_one({
        "name": {"$regex": f"^{bouquet_type}$", "$options": "i"},
        "size": size.lower()
    })

    if not bouquet:
        return 0.0

    item_cost = 0.0
    for material_item in bouquet.get("materials", []):
        material = await db.materials.find_one({"_id": ObjectId(material_item.get("material_id"))})
        if material:
            item_cost += material.get("cost_per_unit", 0) * material_item.get("quantity", 0)

    return item_cost * quantity


async def calculate_order_profit(
    order: Dict,
    db: AsyncIOMotorDatabase
) -> Dict:
    """
    Calculate profit for an order based on bouquet material costs.
    Supports both single-bouquet (legacy) and multi-item orders.
    """
    total_price = order.get("total_price", 0)
    total_cost = 0.0

    order_items = order.get("items", [])

    for item in order_items:
        # Handle both dict (from DB) and object (from Pydantic)
        if isinstance(item, dict):
            bouquet_type = item.get("bouquet_type")
            size = item.get("size", "medium")
            quantity = item.get("quantity", 1)
        else:
            bouquet_type = item.bouquet_type
            size = item.size
            quantity = item.quantity

        total_cost += await _get_bouquet_cost(bouquet_type, size, quantity, db)

    profit = total_price - total_cost
    profit_margin = (profit / total_price * 100) if total_price > 0 else 0

    return {
        "cost": round(total_cost, 2),
        "profit": round(profit, 2),
        "profit_margin": round(profit_margin, 2)
    }


async def deduct_stock_for_order(
    order: Dict,
    db: AsyncIOMotorDatabase
) -> Dict:
    """
    Deduct material stock when an order is completed.
    Supports both single-bouquet (legacy) and multi-item orders.
    """
    deducted_materials = []
    warnings = []

    order_items = order.get("items", [])

    for item in order_items:
        if isinstance(item, dict):
            bouquet_type = item.get("bouquet_type")
            size = item.get("size", "medium")
            quantity = item.get("quantity", 1)
        else:
            bouquet_type = item.bouquet_type
            size = item.size
            quantity = item.quantity

        bouquet = await db.bouquets.find_one({
            "name": {"$regex": f"^{bouquet_type}$", "$options": "i"},
            "size": size.lower()
        })

        if not bouquet:
            warnings.append(f"Bouquet not found: {bouquet_type} ({size})")
            continue

        for material_item in bouquet.get("materials", []):
            material_id = material_item.get("material_id")
            quantity_needed = material_item.get("quantity", 0) * quantity

            material = await db.materials.find_one({"_id": ObjectId(material_id)})
            if not material:
                warnings.append(f"Material {material_item.get('name')} not found")
                continue

            current_stock = material.get("current_stock", 0)
            new_stock = max(0, current_stock - quantity_needed)

            await db.materials.update_one(
                {"_id": ObjectId(material_id)},
                {"$set": {"current_stock": new_stock}}
            )

            deducted_materials.append({
                "name": material["name"],
                "deducted": quantity_needed,
                "new_stock": new_stock
            })

            if new_stock == 0:
                warnings.append(f"{material['name']} is now out of stock")
            elif new_stock < material.get("low_stock_threshold", 10):
                warnings.append(f"{material['name']} is low on stock ({new_stock} remaining)")

    return {
        "success": True,
        "deducted_materials": deducted_materials,
        "warnings": warnings
    }
