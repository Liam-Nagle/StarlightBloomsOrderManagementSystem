import httpx
from typing import Optional

WIX_API_KEY = "YOUR_SECURE_API_KEY_HERE"
WIX_BASE_URL = "https://starlightblooms.wixsite.com/starlight-blooms-by/_functions"

async def notify_wix_dispatch(wix_order_number: str, tracking_number: Optional[str] = None):
    """Notify Wix that order has been dispatched"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WIX_BASE_URL}/dispatchOrder",
                json={
                    "orderNumber": wix_order_number,  # ✅ Changed to orderNumber
                    "trackingNumber": tracking_number or "Not available"
                },
                headers={
                    "Authorization": f"Bearer {WIX_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Wix dispatch notification sent: {result}")
                return {"success": True, "data": result}
            else:
                print(f"❌ Wix dispatch failed: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text}
                
    except Exception as e:
        print(f"❌ Error notifying Wix dispatch: {e}")
        return {"success": False, "error": str(e)}


async def notify_wix_cancellation(wix_order_number: str, reason: Optional[str] = None):
    """Notify Wix that order has been cancelled"""
    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{WIX_BASE_URL}/cancelOrder",
                json={
                    "orderNumber": wix_order_number,  # ✅ Changed to orderNumber
                    "reason": reason or "Cancelled by admin"
                },
                headers={
                    "Authorization": f"Bearer {WIX_API_KEY}",
                    "Content-Type": "application/json"
                },
                timeout=10.0
            )
            
            if response.status_code == 200:
                result = response.json()
                print(f"✅ Wix cancellation notification sent: {result}")
                return {"success": True, "data": result}
            else:
                print(f"❌ Wix cancellation failed: {response.status_code} - {response.text}")
                return {"success": False, "error": response.text}
                
    except Exception as e:
        print(f"❌ Error notifying Wix cancellation: {e}")
        return {"success": False, "error": str(e)}