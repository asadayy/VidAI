import logging
from datetime import datetime, timedelta
from bson import ObjectId
from motor.motor_asyncio import AsyncIOMotorClient
from app.config import settings

logger = logging.getLogger("vidai.db")

class DatabaseClient:
    def __init__(self):
        self.client: AsyncIOMotorClient | None = None
        self.db = None

    def _ensure_connected(self):
        if self.db is None:
            self.connect()

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
        self._ensure_connected()
        if self.db is None:
            return []
        try:
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
            ).limit(50)
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

    async def _get_booked_vendor_ids(self, event_date_str: str | None) -> set:
        """Return set of vendor ObjectIds that have an approved/pending booking on event_date."""
        if not event_date_str or self.db is None:
            return set()
        try:
            dt = datetime.fromisoformat(event_date_str.replace("Z", "+00:00"))
            day_start = dt.replace(hour=0, minute=0, second=0, microsecond=0)
            day_end = day_start + timedelta(days=1)
            cursor = self.db.bookings.find(
                {
                    "eventDate": {"$gte": day_start, "$lt": day_end},
                    "status": {"$in": ["pending", "approved"]},
                },
                {"vendor": 1},
            )
            bookings = await cursor.to_list(length=500)
            return {b["vendor"] for b in bookings if b.get("vendor")}
        except Exception as e:
            logger.warning(f"Failed to check booked vendors: {e}")
            return set()

    async def get_matching_vendors(
        self,
        category: str = "",
        city: str = "",
        budget: float = 0,
        event_date: str | None = None,
    ) -> list[dict]:
        """
        Fetch vendors filtered by category, city, budget proximity, and availability.

        Budget matching logic:
        - Find vendors with any package price in [0, budget * 1.10]
        - Sort by |price - budget| ascending (closest to budget first)
        - Prefer cheaper over pricier when equidistant
        - Exclude vendors booked on event_date
        - Falls back to broader queries if no results
        """
        self._ensure_connected()
        if self.db is None:
            return []

        try:
            booked_ids = await self._get_booked_vendor_ids(event_date)

            base_filter: dict = {"verificationStatus": "approved", "isActive": True}
            if category:
                base_filter["category"] = category
            if city:
                base_filter["city"] = {"$regex": city, "$options": "i"}

            max_price = budget * 1.10 if budget > 0 else 0

            projection = {
                "businessName": 1, "category": 1, "city": 1,
                "description": 1, "startingPrice": 1, "ratingsAverage": 1,
                "packages": 1,
            }

            # ---------- Attempt 1: city + category + budget range ----------
            query = {**base_filter}
            if max_price > 0:
                query["startingPrice"] = {"$gt": 0, "$lte": max_price}

            cursor = self.db.vendors.find(query, projection).limit(30)
            candidates = await cursor.to_list(length=30)

            # ---------- Fallback: drop price filter if too few results -----
            if len(candidates) < 3 and max_price > 0:
                fallback_query = {**base_filter}
                cursor = self.db.vendors.find(fallback_query, projection).limit(30)
                candidates = await cursor.to_list(length=30)
                logger.info("Budget filter relaxed — using all matching vendors")

            # ---------- Fallback: drop city filter if still too few --------
            if len(candidates) < 2 and city:
                no_city_filter = {k: v for k, v in base_filter.items() if k != "city"}
                if max_price > 0:
                    no_city_filter["startingPrice"] = {"$gt": 0, "$lte": max_price}
                cursor = self.db.vendors.find(no_city_filter, projection).limit(30)
                extra = await cursor.to_list(length=30)
                # Merge without duplicates
                seen = {str(c["_id"]) for c in candidates}
                for v in extra:
                    if str(v["_id"]) not in seen:
                        candidates.append(v)
                logger.info("City filter relaxed — expanded to all cities")

            # ---------- Remove booked vendors ---------
            if booked_ids:
                before = len(candidates)
                candidates = [v for v in candidates if v["_id"] not in booked_ids]
                removed = before - len(candidates)
                if removed:
                    logger.info(f"Excluded {removed} vendor(s) booked on {event_date}")

            # ---------- Sort by budget proximity ----------
            def price_distance(v):
                price = v.get("startingPrice") or 0
                if price == 0:
                    return float("inf")
                diff = price - budget if budget > 0 else 0
                # Prefer cheaper: cheaper options get a slight advantage
                # by adding a tiny penalty for going over budget
                if diff > 0:
                    return abs(diff) + diff * 0.1
                return abs(diff)

            if budget > 0:
                candidates.sort(key=price_distance)

            # ---------- Format results ----------
            result = []
            for v in candidates[:15]:  # top 15 candidates for LLM
                packages = [
                    {"name": p.get("name"), "price": p.get("price")}
                    for p in (v.get("packages") or [])[:5]
                    if p.get("isActive", True)
                ]
                is_in_city = True
                if city and v.get("city"):
                    is_in_city = city.lower() in v["city"].lower()
                result.append({
                    "id": str(v.get("_id", "")),
                    "businessName": v.get("businessName", ""),
                    "category": v.get("category", ""),
                    "city": v.get("city", ""),
                    "description": (v.get("description") or "")[:200],
                    "startingPrice": v.get("startingPrice"),
                    "rating": v.get("ratingsAverage"),
                    "packages": packages,
                    "isInUserCity": is_in_city,
                    "availableOnDate": True,  # already filtered out booked ones
                })
            return result
        except Exception as e:
            logger.error(f"Database error in get_matching_vendors: {e}")
            return await self.get_all_vendors()  # graceful fallback

db_client = DatabaseClient()
