"""Starlight Blooms Order Management System - FastAPI Application"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from backend.config import settings
from backend.database import connect_to_mongo, close_mongo_connection
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)

logger = logging.getLogger(__name__)

# Create FastAPI app
app = FastAPI(
    title="Starlight Blooms API",
    description="Order Management System for Florist Business",
    version="1.0.0",
    docs_url="/docs",
    redoc_url="/redoc"
)

# Configure CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.get_allowed_origins_list(),
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    allow_headers=["*"],
)


# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize database connection on startup"""
    logger.info("Starting application...")
    await connect_to_mongo()
    logger.info("Application started successfully")


# Shutdown event
@app.on_event("shutdown")
async def shutdown_event():
    """Close database connection on shutdown"""
    logger.info("Shutting down application...")
    await close_mongo_connection()
    logger.info("Application shut down successfully")


# Health check endpoint
@app.get("/", tags=["Health"])
async def root():
    """Health check endpoint"""
    return {
        "status": "healthy",
        "service": "Starlight Blooms API",
        "version": "1.0.0"
    }


@app.get("/health", tags=["Health"])
async def health_check():
    """Detailed health check"""
    return {
        "status": "healthy",
        "database": "connected",
        "environment": settings.environment
    }


# Import and register routers
from backend.routes import materials, bouquets, orders, reports

app.include_router(materials.router, prefix="/api/materials", tags=["Materials"])
app.include_router(bouquets.router, prefix="/api/bouquets", tags=["Bouquets"])
app.include_router(orders.router, prefix="/api/orders", tags=["Orders"])
app.include_router(reports.router, prefix="/api/reports", tags=["Reports"])
