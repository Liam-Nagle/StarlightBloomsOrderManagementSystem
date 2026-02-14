"""Order model for customer orders"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from datetime import date as DateType
from enum import Enum


class OrderStatus(str, Enum):
    """Order status values"""
    PENDING = "pending"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class OrderBase(BaseModel):
    """Base order fields"""
    customer_name: str = Field(..., min_length=1, max_length=200, description="Customer name")
    bouquet_type: str = Field(..., min_length=1, max_length=200, description="Bouquet type/name")
    size: str = Field(..., description="Bouquet size (small/medium/large)")
    date: DateType = Field(..., description="Order/delivery date")
    delivery_address: str = Field(..., min_length=1, max_length=500, description="Delivery address")
    total_price: float = Field(..., ge=0, description="Total order price")
    status: OrderStatus = Field(default=OrderStatus.PENDING, description="Order status")
    notes: Optional[str] = Field(None, max_length=1000, description="Optional customer notes")
    cost: Optional[float] = Field(None, ge=0, description="Cost of materials for this order")
    profit: Optional[float] = Field(None, description="Profit/loss on this order (total_price - cost)")
    profit_margin: Optional[float] = Field(None, description="Profit margin percentage")


class OrderCreate(OrderBase):
    """Schema for creating a new order"""
    pass


class OrderUpdate(BaseModel):
    """Schema for updating an order (all fields optional)"""
    customer_name: Optional[str] = Field(None, min_length=1, max_length=200)
    bouquet_type: Optional[str] = Field(None, min_length=1, max_length=200)
    size: Optional[str] = None
    date: Optional[DateType] = None
    delivery_address: Optional[str] = Field(None, min_length=1, max_length=500)
    total_price: Optional[float] = Field(None, ge=0)
    status: Optional[OrderStatus] = None
    notes: Optional[str] = Field(None, max_length=1000)


class OrderInDB(OrderBase):
    """Order as stored in database"""
    id: str = Field(..., alias="_id")
    order_number: str = Field(..., description="Auto-generated order number (e.g., JAN001)")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class OrderResponse(OrderBase):
    """Order response schema"""
    id: str
    order_number: str
    created_at: datetime

    class Config:
        from_attributes = True
