"""Seed database with initial materials and bouquets"""
import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from backend.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


# Initial materials data from specification
MATERIALS_DATA = [
    {
        "name": "Spray Rose Aerobic 50cm",
        "type": "Flower",
        "cost_per_unit": 1.80,
        "supplier": "Savin Wholesale",
        "product_number": "120442",
        "current_stock": 100,
        "unit": "stem"
    },
    {
        "name": "Rose Red Naomi 50cm",
        "type": "Flower",
        "cost_per_unit": 2.46,
        "supplier": "Savin Wholesale",
        "product_number": "27157",
        "current_stock": 100,
        "unit": "stem"
    },
    {
        "name": "Spray Rose Kate",
        "type": "Flower",
        "cost_per_unit": 1.74,
        "supplier": "Savin Wholesale",
        "product_number": "115973",
        "current_stock": 100,
        "unit": "stem"
    },
    {
        "name": "Babys Breath",
        "type": "Flower",
        "cost_per_unit": 0.38,
        "supplier": "",
        "product_number": "",
        "current_stock": 200,
        "unit": "stem"
    },
    {
        "name": "Other Greens",
        "type": "Flower",
        "cost_per_unit": 0.75,
        "supplier": "",
        "product_number": "",
        "current_stock": 150,
        "unit": "stem"
    },
    {
        "name": "Ribbon Satin 25x20",
        "type": "Hard Material",
        "cost_per_unit": 4.20,
        "supplier": "Savin Wholesale",
        "product_number": "OT454512",
        "current_stock": 50,
        "unit": "meter"
    },
    {
        "name": "Wrapping Paper",
        "type": "Hard Material",
        "cost_per_unit": 0.36,
        "supplier": "",
        "product_number": "",
        "current_stock": 500,
        "unit": "sheet"
    },
    {
        "name": "Natural Mossing Twine",
        "type": "Hard Material",
        "cost_per_unit": 1.14,
        "supplier": "Savin Wholesale",
        "product_number": "FL2988",
        "current_stock": 100,
        "unit": "meter"
    }
]


async def seed_materials(db):
    """Seed materials collection"""
    logger.info("Seeding materials...")

    # Check if materials already exist
    count = await db.materials.count_documents({})
    if count > 0:
        logger.info(f"Materials collection already has {count} documents. Skipping seed.")
        return

    # Insert materials
    result = await db.materials.insert_many(MATERIALS_DATA)
    logger.info(f"Inserted {len(result.inserted_ids)} materials")

    # Return material IDs for use in bouquets
    materials = {}
    cursor = db.materials.find({})
    async for material in cursor:
        materials[material["name"]] = str(material["_id"])

    return materials


async def seed_bouquets(db, material_ids):
    """Seed bouquets collection with The Amore Bouquet variations"""
    logger.info("Seeding bouquets...")

    # Check if bouquets already exist
    count = await db.bouquets.count_documents({})
    if count > 0:
        logger.info(f"Bouquets collection already has {count} documents. Skipping seed.")
        return

    # Small Amore Bouquet
    small_amore_materials = [
        {
            "material_id": material_ids["Spray Rose Aerobic 50cm"],
            "name": "Spray Rose Aerobic 50cm",
            "quantity": 1,
            "cost_per_unit": 1.80,
            "total_cost": 1.80
        },
        {
            "material_id": material_ids["Rose Red Naomi 50cm"],
            "name": "Rose Red Naomi 50cm",
            "quantity": 3,
            "cost_per_unit": 2.46,
            "total_cost": 7.38
        },
        {
            "material_id": material_ids["Spray Rose Kate"],
            "name": "Spray Rose Kate",
            "quantity": 2,
            "cost_per_unit": 1.74,
            "total_cost": 3.48
        },
        {
            "material_id": material_ids["Babys Breath"],
            "name": "Babys Breath",
            "quantity": 6,
            "cost_per_unit": 0.38,
            "total_cost": 2.28
        },
        {
            "material_id": material_ids["Other Greens"],
            "name": "Other Greens",
            "quantity": 4,
            "cost_per_unit": 0.75,
            "total_cost": 3.00
        },
        {
            "material_id": material_ids["Ribbon Satin 25x20"],
            "name": "Ribbon Satin 25x20",
            "quantity": 0.01,
            "cost_per_unit": 4.20,
            "total_cost": 0.04
        },
        {
            "material_id": material_ids["Wrapping Paper"],
            "name": "Wrapping Paper",
            "quantity": 3,
            "cost_per_unit": 0.36,
            "total_cost": 1.08
        },
        {
            "material_id": material_ids["Natural Mossing Twine"],
            "name": "Natural Mossing Twine",
            "quantity": 0.01,
            "cost_per_unit": 1.14,
            "total_cost": 0.01
        }
    ]

    # Medium Amore Bouquet
    medium_amore_materials = [
        {
            "material_id": material_ids["Spray Rose Aerobic 50cm"],
            "name": "Spray Rose Aerobic 50cm",
            "quantity": 2,
            "cost_per_unit": 1.80,
            "total_cost": 3.60
        },
        {
            "material_id": material_ids["Rose Red Naomi 50cm"],
            "name": "Rose Red Naomi 50cm",
            "quantity": 4,
            "cost_per_unit": 2.46,
            "total_cost": 9.84
        },
        {
            "material_id": material_ids["Spray Rose Kate"],
            "name": "Spray Rose Kate",
            "quantity": 3,
            "cost_per_unit": 1.74,
            "total_cost": 5.22
        },
        {
            "material_id": material_ids["Babys Breath"],
            "name": "Babys Breath",
            "quantity": 6,
            "cost_per_unit": 0.38,
            "total_cost": 2.28
        },
        {
            "material_id": material_ids["Other Greens"],
            "name": "Other Greens",
            "quantity": 6,
            "cost_per_unit": 0.75,
            "total_cost": 4.50
        },
        {
            "material_id": material_ids["Ribbon Satin 25x20"],
            "name": "Ribbon Satin 25x20",
            "quantity": 0.01,
            "cost_per_unit": 4.20,
            "total_cost": 0.04
        },
        {
            "material_id": material_ids["Wrapping Paper"],
            "name": "Wrapping Paper",
            "quantity": 4,
            "cost_per_unit": 0.36,
            "total_cost": 1.44
        },
        {
            "material_id": material_ids["Natural Mossing Twine"],
            "name": "Natural Mossing Twine",
            "quantity": 0.01,
            "cost_per_unit": 1.14,
            "total_cost": 0.01
        }
    ]

    # Large Amore Bouquet
    large_amore_materials = [
        {
            "material_id": material_ids["Spray Rose Aerobic 50cm"],
            "name": "Spray Rose Aerobic 50cm",
            "quantity": 3,
            "cost_per_unit": 1.80,
            "total_cost": 5.40
        },
        {
            "material_id": material_ids["Rose Red Naomi 50cm"],
            "name": "Rose Red Naomi 50cm",
            "quantity": 6,
            "cost_per_unit": 2.46,
            "total_cost": 14.76
        },
        {
            "material_id": material_ids["Spray Rose Kate"],
            "name": "Spray Rose Kate",
            "quantity": 3,
            "cost_per_unit": 1.74,
            "total_cost": 5.22
        },
        {
            "material_id": material_ids["Babys Breath"],
            "name": "Babys Breath",
            "quantity": 6,
            "cost_per_unit": 0.38,
            "total_cost": 2.28
        },
        {
            "material_id": material_ids["Other Greens"],
            "name": "Other Greens",
            "quantity": 8,
            "cost_per_unit": 0.75,
            "total_cost": 6.00
        },
        {
            "material_id": material_ids["Ribbon Satin 25x20"],
            "name": "Ribbon Satin 25x20",
            "quantity": 0.01,
            "cost_per_unit": 4.20,
            "total_cost": 0.04
        },
        {
            "material_id": material_ids["Wrapping Paper"],
            "name": "Wrapping Paper",
            "quantity": 5,
            "cost_per_unit": 0.36,
            "total_cost": 1.80
        },
        {
            "material_id": material_ids["Natural Mossing Twine"],
            "name": "Natural Mossing Twine",
            "quantity": 0.01,
            "cost_per_unit": 1.14,
            "total_cost": 0.01
        }
    ]

    bouquets = [
        {
            "name": "The Amore Bouquet",
            "size": "small",
            "materials": small_amore_materials,
            "total_cost": 19.05,
            "calculated_sale_price": 39.39,  # Will be recalculated
            "sell_price": 49.99,
            "profit": 30.94,
            "profit_margin": 61.88,
            "total_stems": 16,
            "description": "A beautiful romantic bouquet perfect for expressing love"
        },
        {
            "name": "The Amore Bouquet",
            "size": "medium",
            "materials": medium_amore_materials,
            "total_cost": 26.92,
            "calculated_sale_price": 56.66,  # Will be recalculated
            "sell_price": 69.99,
            "profit": 43.07,
            "profit_margin": 61.54,
            "total_stems": 21,
            "description": "A beautiful romantic bouquet perfect for expressing love"
        },
        {
            "name": "The Amore Bouquet",
            "size": "large",
            "materials": large_amore_materials,
            "total_cost": 35.50,
            "calculated_sale_price": 73.93,  # Will be recalculated
            "sell_price": 89.99,
            "profit": 54.49,
            "profit_margin": 60.55,
            "total_stems": 26,
            "description": "A beautiful romantic bouquet perfect for expressing love"
        }
    ]

    result = await db.bouquets.insert_many(bouquets)
    logger.info(f"Inserted {len(result.inserted_ids)} bouquets")


async def seed_database():
    """Main function to seed all collections"""
    try:
        logger.info("Starting database seeding...")

        # Connect to MongoDB
        client = AsyncIOMotorClient(settings.mongodb_url)
        db = client[settings.database_name]

        # Test connection
        await client.admin.command('ping')
        logger.info(f"Connected to MongoDB database: {settings.database_name}")

        # Seed materials first (returns material IDs)
        material_ids = await seed_materials(db)

        # Seed bouquets using material IDs
        if material_ids:
            await seed_bouquets(db, material_ids)

        logger.info("Database seeding completed successfully!")

        # Close connection
        client.close()

    except Exception as e:
        logger.error(f"Error during seeding: {e}")
        raise


if __name__ == "__main__":
    asyncio.run(seed_database())
