"""MongoDB database connection management"""
from motor.motor_asyncio import AsyncIOMotorClient, AsyncIOMotorDatabase
from backend.config import settings
import logging

logger = logging.getLogger(__name__)

# Global database client
mongodb_client: AsyncIOMotorClient = None
database: AsyncIOMotorDatabase = None


async def connect_to_mongo():
    """Establish connection to MongoDB"""
    global mongodb_client, database

    try:
        logger.info("Connecting to MongoDB...")
        mongodb_client = AsyncIOMotorClient(settings.mongodb_url)
        database = mongodb_client[settings.database_name]

        # Test the connection
        await mongodb_client.admin.command('ping')
        logger.info(f"Successfully connected to MongoDB database: {settings.database_name}")

    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise


async def close_mongo_connection():
    """Close MongoDB connection"""
    global mongodb_client

    if mongodb_client:
        logger.info("Closing MongoDB connection...")
        mongodb_client.close()
        logger.info("MongoDB connection closed")


def get_database() -> AsyncIOMotorDatabase:
    """Get database instance for dependency injection"""
    return database
