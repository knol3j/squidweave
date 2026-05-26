from sqlalchemy import Column, Integer, String, Text, DateTime, func
from app.core.database import Base

class CompanyConfig(Base):
    __tablename__ = "company_config"

    id = Column(Integer, primary_key=True, autoincrement=True)
    company_name = Column(String(255), nullable=False)
    industry = Column(String(255))
    settings_json = Column(Text)
    created_at = Column(DateTime, server_default=func.now())
    updated_at = Column(DateTime, server_default=func.now(), onupdate=func.now())
