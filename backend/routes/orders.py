"""Orders API routes"""
from fastapi import APIRouter, HTTPException, Query, Body, Header
from typing import List, Optional
from bson import ObjectId
from datetime import date

from backend.models.order import (
    OrderCreate,
    OrderUpdate,
    OrderResponse,
    OrderStatus
)
from backend.database import get_database
from backend.services.order_service import (
    create_order_with_validation,
    get_orders_with_filters,
    search_orders,
    update_order_status,
    get_today_orders,
    get_pending_orders
)
from backend.services.order_number_generator import generate_order_number
from backend.wix_integration import notify_wix_dispatch, notify_wix_cancellation, WIX_API_KEY

router = APIRouter()


@router.post("/", response_model=dict, status_code=201)
async def create_order(
    order: OrderCreate,
    authorization: Optional[str] = Header(None)
):
    """Create a new order with auto-generated order number, calculate profit, and deduct stock if completed"""

    # If an auth header is provided (e.g. from Wix), validate it
    if authorization and authorization != f"Bearer {WIX_API_KEY}":
        raise HTTPException(status_code=401, detail="Unauthorized")
    db = get_database()

    # Generate order number
    order_number = await generate_order_number(db)

    # Create order
    order_dict = order.model_dump()

    # Calculate profit for the order
    from backend.services.order_service import calculate_order_profit, deduct_stock_for_order
    profit_data = await calculate_order_profit(order_dict, db)
    order_dict["cost"] = profit_data["cost"]
    order_dict["profit"] = profit_data["profit"]
    order_dict["profit_margin"] = profit_data["profit_margin"]

    result = await create_order_with_validation(order_dict, order_number, db)

    if result.get("error"):
        raise HTTPException(status_code=400, detail=result["error"])

    result["order"]["_id"] = str(result["order"]["_id"])
    result["order"]["id"] = result["order"]["_id"]  # Add id field for frontend compatibility

    # If order is created as completed, deduct stock
    stock_deduction_result = None
    if order_dict.get("status") == "completed":
        stock_deduction_result = await deduct_stock_for_order(result["order"], db)

    response = {
        "message": "Order created successfully",
        "order": result["order"]
    }

    if stock_deduction_result:
        response["stock_deduction"] = stock_deduction_result

    return response


@router.get("/", response_model=List[dict])
async def get_orders(
    status: Optional[OrderStatus] = Query(None, description="Filter by order status"),
    start_date: Optional[date] = Query(None, description="Filter by start date (YYYY-MM-DD)"),
    end_date: Optional[date] = Query(None, description="Filter by end date (YYYY-MM-DD)"),
    customer_name: Optional[str] = Query(None, description="Filter by customer name (partial match)"),
    limit: int = Query(100, ge=1, le=500, description="Maximum number of results"),
    skip: int = Query(0, ge=0, description="Number of results to skip")
):
    """Get all orders with optional filters"""
    db = get_database()

    orders = await get_orders_with_filters(
        db=db,
        status=status,
        start_date=start_date,
        end_date=end_date,
        customer_name=customer_name,
        limit=limit,
        skip=skip
    )

    return orders


@router.get("/today", response_model=List[dict])
async def get_todays_orders():
    """Get today's orders"""
    db = get_database()
    return await get_today_orders(db)


@router.get("/pending", response_model=List[dict])
async def get_all_pending_orders():
    """Get all pending orders"""
    db = get_database()
    return await get_pending_orders(db)


@router.get("/search", response_model=List[dict])
async def search_orders_endpoint(
    q: str = Query(..., min_length=1, description="Search term")
):
    """Search orders by customer name, order number, delivery address, or bouquet type"""
    db = get_database()
    return await search_orders(q, db)


@router.get("/{order_id}", response_model=dict)
async def get_order(order_id: str):
    """Get a specific order by ID"""
    db = get_database()

    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    order["_id"] = str(order["_id"])
    order["id"] = order["_id"]  # Add id field for frontend compatibility
    return order


@router.put("/{order_id}", response_model=dict)
async def update_order(order_id: str, order_update: OrderUpdate):
    """Update an order, recalculate profit, and deduct stock if status changes to completed"""
    db = get_database()

    # Get current order to check status change
    try:
        current_order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid order ID: {str(e)}")

    if not current_order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Remove None values
    update_data = {k: v for k, v in order_update.model_dump().items() if v is not None}

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    # Convert date to datetime for MongoDB compatibility
    if "date" in update_data:
        from datetime import datetime, date
        if isinstance(update_data["date"], date) and not isinstance(update_data["date"], datetime):
            update_data["date"] = datetime.combine(update_data["date"], datetime.min.time())

    # Recalculate profit if total_price or bouquet changed
    if "total_price" in update_data or "bouquet_type" in update_data or "size" in update_data:
        from backend.services.order_service import calculate_order_profit
        # Merge current order with updates for calculation
        temp_order = {**current_order, **update_data}
        profit_data = await calculate_order_profit(temp_order, db)
        update_data["cost"] = profit_data["cost"]
        update_data["profit"] = profit_data["profit"]
        update_data["profit_margin"] = profit_data["profit_margin"]

    # Check if status is changing to completed
    old_status = current_order.get("status")
    new_status = update_data.get("status")
    stock_deduction_result = None

    if new_status == "completed" and old_status != "completed":
        # Deduct stock for the order
        from backend.services.order_service import deduct_stock_for_order
        stock_deduction_result = await deduct_stock_for_order(current_order, db)

    try:
        result = await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": update_data}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Error updating order: {str(e)}")

    updated_order = await db.orders.find_one({"_id": ObjectId(order_id)})
    updated_order["_id"] = str(updated_order["_id"])
    updated_order["id"] = updated_order["_id"]  # Add id field for frontend compatibility

    response = {
        "message": "Order updated successfully",
        "order": updated_order
    }

    if stock_deduction_result:
        response["stock_deduction"] = stock_deduction_result

    return response


@router.patch("/{order_id}/status", response_model=dict)
async def update_status(
    order_id: str,
    status: OrderStatus = Body(..., description="New order status"),
    tracking_number: Optional[str] = Body(None, description="Tracking number for dispatched orders"),
    cancellation_reason: Optional[str] = Body(None, description="Reason for cancellation")
):
    """Update order status and notify Wix if applicable"""
    db = get_database()

    # Get current order
    try:
        order = await db.orders.find_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    if not order:
        raise HTTPException(status_code=404, detail="Order not found")

    # Prepare update data
    update_data = {"status": status.value if isinstance(status, OrderStatus) else status}
    if tracking_number:
        update_data["tracking_number"] = tracking_number

    # Update status in database
    try:
        await db.orders.update_one(
            {"_id": ObjectId(order_id)},
            {"$set": update_data}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to update order: {str(e)}")

    # Notify Wix if order came from Wix
    wix_result = None
    wix_notified = False

    if order.get("wix_order_number"):
        if status == OrderStatus.DISPATCHED or (isinstance(status, str) and status == "dispatched"):
            wix_result = await notify_wix_dispatch(
                order["wix_order_number"],
                tracking_number
            )
            wix_notified = wix_result.get("success", False)

        elif status == OrderStatus.CANCELLED or (isinstance(status, str) and status == "cancelled"):
            wix_result = await notify_wix_cancellation(
                order["wix_order_number"],
                cancellation_reason
            )
            wix_notified = wix_result.get("success", False)

    # Get updated order
    updated_order = await db.orders.find_one({"_id": ObjectId(order_id)})
    updated_order["_id"] = str(updated_order["_id"])
    updated_order["id"] = updated_order["_id"]

    response = {
        "message": "Order status updated successfully",
        "order": updated_order,
        "wix_notified": wix_notified
    }

    if wix_result and not wix_notified:
        response["wix_error"] = wix_result.get("error")

    return response


@router.delete("/{order_id}", response_model=dict)
async def delete_order(order_id: str):
    """Delete an order"""
    db = get_database()

    try:
        result = await db.orders.delete_one({"_id": ObjectId(order_id)})
    except Exception:
        raise HTTPException(status_code=400, detail="Invalid order ID")

    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Order not found")

    return {"message": "Order deleted successfully"}
