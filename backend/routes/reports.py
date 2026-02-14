"""Reports and Analytics API routes"""
from fastapi import APIRouter, Query
from typing import Optional
from datetime import date, datetime, timedelta
from bson import ObjectId

from backend.database import get_database

router = APIRouter()


@router.get("/sales-summary")
async def get_sales_summary(
    start_date: Optional[date] = Query(None, description="Start date for report"),
    end_date: Optional[date] = Query(None, description="End date for report")
):
    """Get sales summary with revenue and order statistics"""
    db = get_database()

    # Default to last 30 days if no dates provided
    if not end_date:
        end_date = date.today()
    if not start_date:
        start_date = end_date - timedelta(days=30)

    # Build query - convert dates to datetime for MongoDB compatibility
    query = {
        "date": {
            "$gte": datetime.combine(start_date, datetime.min.time()),
            "$lte": datetime.combine(end_date, datetime.max.time())
        }
    }

    # Aggregate sales data
    total_revenue = 0
    total_orders = 0
    completed_orders = 0
    pending_orders = 0
    cancelled_orders = 0

    cursor = db.orders.find(query)

    async for order in cursor:
        total_orders += 1
        total_revenue += order.get("total_price", 0)

        status = order.get("status", "pending")
        if status == "completed":
            completed_orders += 1
        elif status == "pending":
            pending_orders += 1
        elif status == "cancelled":
            cancelled_orders += 1

    # Calculate average order value
    avg_order_value = total_revenue / total_orders if total_orders > 0 else 0

    return {
        "start_date": start_date.isoformat(),
        "end_date": end_date.isoformat(),
        "total_revenue": round(total_revenue, 2),
        "total_orders": total_orders,
        "completed_orders": completed_orders,
        "pending_orders": pending_orders,
        "cancelled_orders": cancelled_orders,
        "average_order_value": round(avg_order_value, 2)
    }


@router.get("/popular-bouquets")
async def get_popular_bouquets(
    limit: int = Query(10, ge=1, le=50, description="Number of top bouquets to return")
):
    """Get most popular bouquets by order count"""
    db = get_database()

    # Aggregate orders by bouquet type
    pipeline = [
        {
            "$group": {
                "_id": {
                    "bouquet_type": "$bouquet_type",
                    "size": "$size"
                },
                "order_count": {"$sum": 1},
                "total_revenue": {"$sum": "$total_price"}
            }
        },
        {
            "$sort": {"order_count": -1}
        },
        {
            "$limit": limit
        }
    ]

    results = []
    async for doc in db.orders.aggregate(pipeline):
        results.append({
            "bouquet_type": doc["_id"]["bouquet_type"],
            "size": doc["_id"]["size"],
            "order_count": doc["order_count"],
            "total_revenue": round(doc["total_revenue"], 2)
        })

    return {
        "top_bouquets": results,
        "count": len(results)
    }


@router.get("/profit-analysis")
async def get_profit_analysis():
    """Analyze profit margins across all bouquets"""
    db = get_database()

    bouquets = []
    total_potential_profit = 0
    total_cost = 0
    total_sell_price = 0

    cursor = db.bouquets.find({})

    async for bouquet in cursor:
        profit = bouquet.get("profit", 0)
        profit_margin = bouquet.get("profit_margin", 0)
        cost = bouquet.get("total_cost", 0)
        sell_price = bouquet.get("sell_price", 0)

        total_potential_profit += profit
        total_cost += cost
        total_sell_price += sell_price

        bouquets.append({
            "name": bouquet["name"],
            "size": bouquet["size"],
            "total_cost": round(cost, 2),
            "sell_price": round(sell_price, 2),
            "profit": round(profit, 2),
            "profit_margin": round(profit_margin, 2)
        })

    # Sort by profit margin
    bouquets.sort(key=lambda x: x["profit_margin"], reverse=True)

    # Calculate overall metrics
    overall_margin = (
        (total_potential_profit / total_sell_price * 100)
        if total_sell_price > 0 else 0
    )

    return {
        "bouquets": bouquets,
        "total_bouquets": len(bouquets),
        "total_potential_profit": round(total_potential_profit, 2),
        "total_cost": round(total_cost, 2),
        "total_sell_price": round(total_sell_price, 2),
        "overall_profit_margin": round(overall_margin, 2)
    }


@router.get("/inventory-status")
async def get_inventory_status():
    """Get inventory status with low stock alerts"""
    db = get_database()

    total_materials = 0
    low_stock_count = 0
    out_of_stock_count = 0
    materials_by_type = {"Flower": 0, "Hard Material": 0}
    low_stock_items = []

    cursor = db.materials.find({})

    async for material in cursor:
        total_materials += 1

        material_type = material.get("type", "Unknown")
        if material_type in materials_by_type:
            materials_by_type[material_type] += 1

        stock = material.get("current_stock")

        if stock is not None:
            if stock == 0:
                out_of_stock_count += 1
                low_stock_items.append({
                    "name": material["name"],
                    "stock": stock,
                    "status": "out_of_stock"
                })
            elif stock <= 20:  # Low stock threshold
                low_stock_count += 1
                low_stock_items.append({
                    "name": material["name"],
                    "stock": stock,
                    "status": "low_stock"
                })

    return {
        "total_materials": total_materials,
        "materials_by_type": materials_by_type,
        "low_stock_count": low_stock_count,
        "out_of_stock_count": out_of_stock_count,
        "low_stock_items": low_stock_items
    }


@router.get("/monthly-trends")
async def get_monthly_trends(
    months: int = Query(6, ge=1, le=12, description="Number of months to analyze")
):
    """Get monthly sales trends"""
    db = get_database()

    # Calculate date range
    end_date = date.today()
    start_date = end_date - timedelta(days=months * 30)

    # Aggregate by month - convert dates to datetime for MongoDB compatibility
    pipeline = [
        {
            "$match": {
                "date": {
                    "$gte": datetime.combine(start_date, datetime.min.time()),
                    "$lte": datetime.combine(end_date, datetime.max.time())
                }
            }
        },
        {
            "$group": {
                "_id": {
                    "year": {"$year": "$date"},
                    "month": {"$month": "$date"}
                },
                "order_count": {"$sum": 1},
                "total_revenue": {"$sum": "$total_price"}
            }
        },
        {
            "$sort": {"_id.year": 1, "_id.month": 1}
        }
    ]

    results = []
    async for doc in db.orders.aggregate(pipeline):
        month_name = datetime(doc["_id"]["year"], doc["_id"]["month"], 1).strftime("%B %Y")
        results.append({
            "month": month_name,
            "year": doc["_id"]["year"],
            "month_number": doc["_id"]["month"],
            "order_count": doc["order_count"],
            "total_revenue": round(doc["total_revenue"], 2)
        })

    return {
        "monthly_data": results,
        "period_months": months
    }
