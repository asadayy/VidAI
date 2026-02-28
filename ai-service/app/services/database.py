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
            self.client = AsyncIOMotorClient(settings.MONGODB_URI)
            self.db = self.client[settings.DB_NAME]
            logger.info(f"Connected to MongoDB at {settings.MONGODB_URI.split('@')[-1] if '@' in settings.MONGODB_URI else 'localhost'} - DB: {settings.DB_NAME}")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {str(e)}")

    def close(self):
        if self.client:
            self.client.close()
            logger.info("MongoDB connection closed")

    async def get_all_vendors(self):
        """Fetch all approved and active vendors from the database."""
        if self.db is None:
            self.connect()
        try:
            # Assuming vendors are stored in 'users' collection with role='vendor'
            cursor = self.db.users.find({"role": "vendor", "isApproved": True})
            vendors = await cursor.to_list(length=1000)
            
            # Need to fetch services too, maybe from 'services' or embedded
            result = []
            for v in vendors:
                v_id = v.get("_id")
                
                # Fetch services linked to this vendor
                services_cursor = self.db.services.find({"vendor": v_id})
                services = await services_cursor.to_list(length=100)
                
                result.append({
                    "id": str(v_id),
                    "businessName": v.get("businessName", v.get("name")),
                    "city": v.get("city"),
                    "servicesOffered": v.get("servicesOffered", []),
                    "services": [
                        {
                            "id": str(s.get("_id")),
                            "title": s.get("title"),
                            "description": s.get("description"),
                            "price": s.get("price"),
                            "priceUnit": s.get("priceUnit"),
                            "category": s.get("category"),
                            "city": s.get("city")
                        } for s in services
                    ]
                })
            return result
        except Exception as e:
            logger.error(f"Database error fetching vendors: {e}")
            return []

db_client = DatabaseClient()
