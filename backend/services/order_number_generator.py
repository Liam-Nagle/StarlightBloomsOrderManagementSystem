"""Order number generation service"""
from datetime import datetime
from motor.motor_asyncio import AsyncIOMotorDatabase


async def generate_order_number(db: AsyncIOMotorDatabase) -> str:
    """
    Generate unique order number in format: {MONTH}{SEQUENCE}

    Examples: JAN001, JAN002, FEB001, DEC152

    The sequence resets to 001 at the start of each month.

    Args:
        db: MongoDB database instance

    Returns:
        str: Generated order number (e.g., "JAN001")
    """
    now = datetime.now()
    month_abbr = now.strftime("%b").upper()  # JAN, FEB, MAR, etc.

    # Find the last order number for current month
    last_order = await db.orders.find_one(
        {"order_number": {"$regex": f"^{month_abbr}"}},
        sort=[("order_number", -1)]
    )

    if last_order and "order_number" in last_order:
        # Extract the numeric part and increment
        try:
            last_num = int(last_order["order_number"][3:])
            next_num = last_num + 1
        except (ValueError, IndexError):
            # If parsing fails, start from 1
            next_num = 1
    else:
        # First order of the month
        next_num = 1

    # Format with zero-padding (3 digits)
    order_number = f"{month_abbr}{next_num:03d}"

    return order_number


async def get_month_order_count(db: AsyncIOMotorDatabase, month: str = None) -> int:
    """
    Get count of orders for a specific month

    Args:
        db: MongoDB database instance
        month: Month abbreviation (e.g., "JAN"). If None, uses current month.

    Returns:
        int: Number of orders for the month
    """
    if month is None:
        month = datetime.now().strftime("%b").upper()

    count = await db.orders.count_documents(
        {"order_number": {"$regex": f"^{month}"}}
    )

    return count
