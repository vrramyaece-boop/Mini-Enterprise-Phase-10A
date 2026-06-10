# services/pagination_service.py — Phase 4: Reusable pagination
import math, logging
logger = logging.getLogger(__name__)
MAX_PAGE_SIZE = 100

def paginate(query, page: int, page_size: int) -> dict:
    page      = max(1, page)
    page_size = min(max(1, page_size), MAX_PAGE_SIZE)
    total       = query.count()
    total_pages = math.ceil(total / page_size) if total > 0 else 1
    items       = query.offset((page - 1) * page_size).limit(page_size).all()
    return {"items": items, "total": total, "page": page,
            "page_size": page_size, "total_pages": total_pages}
