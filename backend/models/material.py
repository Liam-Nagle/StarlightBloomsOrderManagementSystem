"""Material model for inventory items"""
from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime
from enum import Enum


class MaterialType(str, Enum):
    """Types of materials used in bouquets"""
    FLOWER = "Flower"
    HARD_MATERIAL = "Hard Material"


class MaterialBase(BaseModel):
    """Base material fields"""
    name: str = Field(..., min_length=1, max_length=200, description="Material name")
    type: MaterialType = Field(..., description="Material type: Flower or Hard Material")
    cost_per_unit: float = Field(..., ge=0, description="Cost per unit in pounds")
    supplier: Optional[str] = Field(None, max_length=200, description="Supplier name")
    product_number: Optional[str] = Field(None, max_length=100, description="Product/SKU number")
    current_stock: Optional[float] = Field(None, ge=0, description="Current stock level")
    unit: Optional[str] = Field("stem", max_length=50, description="Unit of measurement (stem, each, meter)")
    low_stock_threshold: Optional[float] = Field(10, ge=0, description="Alert when stock falls below this level")


class MaterialCreate(MaterialBase):
    """Schema for creating a new material"""
    pass


class MaterialUpdate(BaseModel):
    """Schema for updating a material (all fields optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    type: Optional[MaterialType] = None
    cost_per_unit: Optional[float] = Field(None, ge=0)
    supplier: Optional[str] = Field(None, max_length=200)
    product_number: Optional[str] = Field(None, max_length=100)
    current_stock: Optional[float] = Field(None, ge=0)
    unit: Optional[str] = Field(None, max_length=50)
    low_stock_threshold: Optional[float] = Field(None, ge=0)


class MaterialInDB(MaterialBase):
    """Material as stored in database"""
    id: str = Field(..., alias="_id")
    last_updated: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class MaterialResponse(MaterialBase):
    """Material response schema"""
    id: str
    last_updated: datetime

    class Config:
        from_attributes = True
