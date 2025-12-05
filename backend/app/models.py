from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime


class Role(str, Enum):
    admin = "ADMIN"
    customs = "CUSTOMS_OFFICER"
    importer = "IMPORTER"
    quay = "QUAY_OPERATOR"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: Role = Field(sa_column_kwargs={"nullable": False})
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Importer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    customs_registration_number: str = Field(index=True, unique=True)
    contact_email: Optional[str] = None
    created_by_user_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    bookings: List["Booking"] = Relationship(back_populates="importer")
    verifications: List["Verified"] = Relationship(back_populates="importer")


class Vessel(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    imo: Optional[str] = None


class Shipment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vessel_id: Optional[int] = Field(default=None, foreign_key="vessel.id")
    voyage_number: Optional[str] = None
    arrival_date: Optional[datetime] = None
    bookings: List["Booking"] = Relationship(back_populates="shipment")


class DocumentType(str, Enum):
    STANDARD = "STANDARD"
    MANUAL_RELEASE = "MANUAL_RELEASE"
    LETTER = "LETTER"


class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    importer_id: Optional[int] = Field(default=None, foreign_key="importer.id")
    shipment_id: Optional[int] = Field(default=None, foreign_key="shipment.id")
    document_type: DocumentType = Field(default=DocumentType.STANDARD)
    created_by_user_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    importer: Optional[Importer] = Relationship(back_populates="bookings")
    shipment: Optional[Shipment] = Relationship(back_populates="bookings")
    containers: List["Container"] = Relationship(back_populates="booking")
    verification_id: Optional[int] = Field(default=None, foreign_key="verified.id")


class Container(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: Optional[int] = Field(default=None, foreign_key="booking.id")
    container_number: str
    size: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    booking: Optional[Booking] = Relationship(back_populates="containers")


class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class Verified(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    importer_id: Optional[int] = Field(default=None, foreign_key="importer.id")
    bank_name: str
    amount: float = Field(sa_column_kwargs={"check_constraint": "amount >= 0"})
    currency_code: str = Field(default="USD")
    reference_number: str = Field(index=True)
    customs_registration_number: Optional[str] = None
    status: VerificationStatus = Field(default=VerificationStatus.PENDING)
    created_by_user_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    importer: Optional[Importer] = Relationship(back_populates="verifications")
from typing import Optional, List
from enum import Enum
from sqlmodel import SQLModel, Field, Relationship
from datetime import datetime


class Role(str, Enum):
    admin = "ADMIN"
    customs = "CUSTOMS_OFFICER"
    importer = "IMPORTER"
    quay = "QUAY_OPERATOR"


class User(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    username: str = Field(index=True, unique=True)
    password_hash: str
    role: Role = Field(sa_column_kwargs={"nullable": False})
    created_at: datetime = Field(default_factory=datetime.utcnow)


class Importer(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    customs_registration_number: str = Field(index=True, unique=True)
    contact_email: Optional[str] = None
    created_by_user_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    bookings: List["Booking"] = Relationship(back_populates="importer")
    verifications: List["Verified"] = Relationship(back_populates="importer")


class Vessel(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    name: str
    imo: Optional[str] = None


class Shipment(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    vessel_id: Optional[int] = Field(default=None, foreign_key="vessel.id")
    voyage_number: Optional[str] = None
    arrival_date: Optional[datetime] = None
    bookings: List["Booking"] = Relationship(back_populates="shipment")


class DocumentType(str, Enum):
    STANDARD = "STANDARD"
    MANUAL_RELEASE = "MANUAL_RELEASE"
    LETTER = "LETTER"


class Booking(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    importer_id: Optional[int] = Field(default=None, foreign_key="importer.id")
    shipment_id: Optional[int] = Field(default=None, foreign_key="shipment.id")
    document_type: DocumentType = Field(default=DocumentType.STANDARD)
    created_by_user_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    importer: Optional[Importer] = Relationship(back_populates="bookings")
    shipment: Optional[Shipment] = Relationship(back_populates="bookings")
    containers: List["Container"] = Relationship(back_populates="booking")
    verification_id: Optional[int] = Field(default=None, foreign_key="verified.id")


class Container(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    booking_id: Optional[int] = Field(default=None, foreign_key="booking.id")
    container_number: str
    size: Optional[str] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    booking: Optional[Booking] = Relationship(back_populates="containers")


class VerificationStatus(str, Enum):
    PENDING = "PENDING"
    VERIFIED = "VERIFIED"
    REJECTED = "REJECTED"


class Verified(SQLModel, table=True):
    id: Optional[int] = Field(default=None, primary_key=True)
    importer_id: Optional[int] = Field(default=None, foreign_key="importer.id")
    bank_name: str
    amount: float = Field(sa_column_kwargs={"check_constraint": "amount >= 0"})
    currency_code: str = Field(default="USD")
    reference_number: str = Field(index=True)
    customs_registration_number: Optional[str] = None
    status: VerificationStatus = Field(default=VerificationStatus.PENDING)
    created_by_user_id: Optional[int] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
    importer: Optional[Importer] = Relationship(back_populates="verifications")
from typing import Optional, List\nfrom enum import Enum\nfrom sqlmodel import SQLModel, Field, Relationship\nfrom datetime import datetime\n\nclass Role(str, Enum):\n    admin = 'ADMIN'\n    customs = 'CUSTOMS_OFFICER'\n    importer = 'IMPORTER'\n    quay = 'QUAY_OPERATOR'\n\nclass User(SQLModel, table=True):\n    id: Optional[int] = Field(default=None, primary_key=True)\n    username: str = Field(index=True, unique=True)\n    password_hash: str\n    role: Role\n    created_at: datetime = Field(default_factory=datetime.utcnow)\n\nclass Importer(SQLModel, table=True):\n    id: Optional[int] = Field(default=None, primary_key=True)\n    name: str\n    customs_registration_number: str = Field(index=True, unique=True)\n    contact_email: Optional[str] = None\n    created_by_user_id: Optional[int] = None\n    created_at: datetime = Field(default_factory=datetime.utcnow)\n    bookings: List['Booking'] = Relationship(back_populates='importer')\n    verifications: List['Verified'] = Relationship(back_populates='importer')\n\nclass Vessel(SQLModel, table=True):\n    id: Optional[int] = Field(default=None, primary_key=True)\n    name: str\n    imo: Optional[str] = None\n\nclass Shipment(SQLModel, table=True):\n    id: Optional[int] = Field(default=None, primary_key=True)\n    vessel_id: Optional[int] = Field(default=None, foreign_key='vessel.id')\n    voyage_number: Optional[str] = None\n    arrival_date: Optional[datetime] = None\n    bookings: List['Booking'] = Relationship(back_populates='shipment')\n\nclass DocumentType(str, Enum):\n    STANDARD = 'STANDARD'\n    MANUAL_RELEASE = 'MANUAL_RELEASE'\n    LETTER = 'LETTER'\n\nclass Booking(SQLModel, table=True):\n    id: Optional[int] = Field(default=None, primary_key=True)\n    importer_id: Optional[int] = Field(default=None, foreign_key='importer.id')\n    shipment_id: Optional[int] = Field(default=None, foreign_key='shipment.id')\n    document_type: DocumentType = Field(default=DocumentType.STANDARD)\n    created_by_user_id: Optional[int] = None\n    created_at: datetime = Field(default_factory=datetime.utcnow)\n    importer: Optional[Importer] = Relationship(back_populates='bookings')\n    shipment: Optional[Shipment] = Relationship(back_populates='bookings')\n    containers: List['Container'] = Relationship(back_populates='booking')\n    verification_id: Optional[int] = Field(default=None, foreign_key='verified.id')\n\nclass Container(SQLModel, table=True):\n    id: Optional[int] = Field(default=None, primary_key=True)\n    booking_id: Optional[int] = Field(default=None, foreign_key='booking.id')\n    container_number: str\n    size: Optional[str] = None\n    created_at: datetime = Field(default_factory=datetime.utcnow)\n    booking: Optional[Booking] = Relationship(back_populates='containers')\n\nclass VerificationStatus(str, Enum):\n    PENDING = 'PENDING'\n    VERIFIED = 'VERIFIED'\n    REJECTED = 'REJECTED'\n\nclass Verified(SQLModel, table=True):\n    id: Optional[int] = Field(default=None, primary_key=True)\n    importer_id: Optional[int] = Field(default=None, foreign_key='importer.id')\n    bank_name: str\n    amount: float\n    currency_code: str = Field(default='USD')\n    reference_number: str = Field(index=True)\n    customs_registration_number: Optional[str] = None\n    status: VerificationStatus = Field(default=VerificationStatus.PENDING)\n    created_by_user_id: Optional[int] = None\n    created_at: datetime = Field(default_factory=datetime.utcnow)\n    importer: Optional[Importer] = Relationship(back_populates='verifications')\n
