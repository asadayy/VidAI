import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("vidai.db")

class DatabaseClient:
    def __init__(self):
        self.client: AsyncIOMotorClient | None = None
        self.db = None

    def connect(self):
        try:
            self.client = AsyncIOMotorClient(
                settings.MONGODB_URI,
                serverSelectionTimeoutMS=5000,
                connectTimeoutMS=5000,
                socketTimeoutMS=10000,
            )
            self.db = self.client[settings.DB_NAME]
            logger.info(f"Connected to MongoDB - DB: {settings.DB_NAME}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")

    def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    async def get_all_vendors(self):
        """Fetch all approved and active vendors from the vendors collection."""
        if self.db is None:
            self.connect()
        if self.db is None:
            return []
        try:
            # Vendors live in their own 'vendors' collection
            cursor = self.db.vendors.find(
                {"verificationStatus": "approved", "isActive": True},
                {
                    "businessName": 1,
                    "category": 1,
                    "city": 1,
                    "description": 1,
                    "startingPrice": 1,
                    "ratingsAverage": 1,
                    "packages": 1,
                }
            ).limit(50)  # cap to avoid huge context
            vendors = await cursor.to_list(length=50)

            result = []
            for v in vendors:
                packages = [
                    {"name": p.get("name"), "price": p.get("price")}
                    for p in (v.get("packages") or [])[:3]
                    if p.get("isActive", True)
                ]
                result.append({
                    "id": str(v.get("_id", "")),
                    "businessName": v.get("businessName", ""),
                    "category": v.get("category", ""),
                    "city": v.get("city", ""),
                    "description": (v.get("description") or "")[:200],
                    "startingPrice": v.get("startingPrice"),
                    "rating": v.get("ratingsAverage"),
                    "packages": packages,
                })
            return result
        except Exception as e:
            logger.error(f"Database error fetching vendors: {e}")
            return []

db_client = DatabaseClient()
