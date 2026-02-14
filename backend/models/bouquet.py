"""Bouquet model for flower arrangements"""
from pydantic import BaseModel, Field
from typing import List, Optional
from datetime import datetime
from enum import Enum


class BouquetSize(str, Enum):
    """Bouquet sizes"""
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"


class BouquetMaterial(BaseModel):
    """Material used in a bouquet"""
    material_id: str = Field(..., description="Reference to material ID")
    name: str = Field(..., description="Material name (denormalized for display)")
    quantity: float = Field(..., gt=0, description="Quantity used")
    cost_per_unit: float = Field(..., ge=0, description="Cost per unit at time of creation")
    total_cost: float = Field(..., ge=0, description="Total cost for this material")


class BouquetBase(BaseModel):
    """Base bouquet fields"""
    name: str = Field(..., min_length=1, max_length=200, description="Bouquet name")
    size: BouquetSize = Field(..., description="Bouquet size: small, medium, or large")
    materials: List[BouquetMaterial] = Field(..., min_items=1, description="List of materials used")
    total_cost: float = Field(..., ge=0, description="Total cost of all materials")
    calculated_sale_price: float = Field(..., ge=0, description="Calculated sale price using formula")
    sell_price: float = Field(..., ge=0, description="Actual selling price (can be customized)")
    profit_margin: float = Field(..., description="Profit margin percentage")
    profit: float = Field(..., description="Profit in pounds")
    total_stems: int = Field(..., ge=0, description="Total number of stems")
    image_url: Optional[str] = Field(None, max_length=500, description="URL to bouquet image")
    description: Optional[str] = Field(None, max_length=1000, description="Bouquet description")


class BouquetCreate(BouquetBase):
    """Schema for creating a new bouquet"""
    pass


class BouquetUpdate(BaseModel):
    """Schema for updating a bouquet (all fields optional)"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    size: Optional[BouquetSize] = None
    materials: Optional[List[BouquetMaterial]] = Field(None, min_items=1)
    total_cost: Optional[float] = Field(None, ge=0)
    calculated_sale_price: Optional[float] = Field(None, ge=0)
    sell_price: Optional[float] = Field(None, ge=0)
    profit_margin: Optional[float] = None
    profit: Optional[float] = None
    total_stems: Optional[int] = Field(None, ge=0)
    image_url: Optional[str] = Field(None, max_length=500)
    description: Optional[str] = Field(None, max_length=1000)


class BouquetInDB(BouquetBase):
    """Bouquet as stored in database"""
    id: str = Field(..., alias="_id")
    created_at: datetime = Field(default_factory=datetime.utcnow)

    class Config:
        populate_by_name = True


class BouquetResponse(BouquetBase):
    """Bouquet response schema"""
    id: str
    created_at: datetime

    class Config:
        from_attributes = True


class PriceCalculationRequest(BaseModel):
    """Request schema for calculating bouquet pricing"""
    materials: List[dict] = Field(..., description="List of {material_id, quantity}")
    size: BouquetSize = Field(..., description="Bouquet size for labor cost")


class PriceCalculationResponse(BaseModel):
    """Response schema for pricing calculation"""
    total_cost: float
    calculated_sale_price: float
    profit: float
    profit_margin: float
