from sqlalchemy import Column, Integer, String, Text, DateTime, func, Float
from app.core.database import Base

class RevenueSnapshot(Base):
    __tablename__ = "revenue_snapshots"

    id = Column(Integer, primary_key=True, autoincrement=True)
    snapshot_date = Column(DateTime)
    mrr_cents = Column(Integer, default=0)
    arr_cents = Column(Integer, default=0)
    active_subscribers = Column(Integer, default=0)
    churned_today = Column(Integer, default=0)
    new_today = Column(Integer, default=0)
    total_revenue_month_cents = Column(Integer, default=0)
    stripe_balance_cents = Column(Integer, default=0)
    created_at = Column(DateTime, server_default=func.now())

class ExpenseRecord(Base):
    __tablename__ = "expense_records"

    id = Column(Integer, primary_key=True, autoincrement=True)
    category = Column(String(100))
    vendor = Column(String(255))
    amount_cents = Column(Integer)
    currency = Column(String(10), default="USD")
    description = Column(Text)
    date = Column(DateTime)
    external_ref = Column(String(255))
    created_at = Column(DateTime, server_default=func.now())

class StripeEvent(Base):
    __tablename__ = "stripe_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    stripe_event_id = Column(String(255), unique=True)
    event_type = Column(String(100))
    customer_id = Column(String(255))
    amount_cents = Column(Integer)
    currency = Column(String(10))
    status = Column(String(50))
    raw_payload = Column(Text)
    processed_at = Column(DateTime, server_default=func.now())
