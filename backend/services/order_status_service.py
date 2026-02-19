from typing import Optional, Tuple
from backend.integrations.wix import (
    notify_wix_dispatch,
    notify_wix_cancellation,
)
from backend.models.order import OrderStatus


async def handle_wix_status_change(
    *,
    order: dict,
    old_status: Optional[str],
    new_status: Optional[str],
    tracking_number: Optional[str] = None,
    cancellation_reason: Optional[str] = None,
) -> Tuple[bool, Optional[dict]]:
    """
    Handle Wix notifications when order status changes.

    Returns:
        (wix_notified, wix_result)
    """

    # Only Wix orders need notifications
    if not order.get("wix_order_number"):
        return False, None

    if not new_status or new_status == old_status:
        return False, None

    wix_result = None
    wix_notified = False

    # Normalize enum/string
    new_status_value = (
        new_status.value if isinstance(new_status, OrderStatus) else new_status
    )

    if new_status_value == "dispatched":
        wix_result = await notify_wix_dispatch(
            order["wix_order_number"],
            tracking_number
        )
        wix_notified = wix_result.get("success", False)

    elif new_status_value == "cancelled":
        wix_result = await notify_wix_cancellation(
            order["wix_order_number"],
            cancellation_reason
        )
        wix_notified = wix_result.get("success", False)

    return wix_notified, wix_result
