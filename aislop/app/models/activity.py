from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.core.database import Base

class ActivityLog(Base):
    __tablename__ = "activity_logs"

    id = Column(Integer, primary_key=True, autoincrement=True)
    activity_type = Column(String(100))
    description = Column(Text)
    metadata_json = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
