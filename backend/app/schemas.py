from typing import Optional, List
from datetime import datetime
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class UserCreate(BaseModel):
    username: str
    password: str
    role: str


class ImporterCreate(BaseModel):
    name: str
    customs_registration_number: str
    contact_email: Optional[EmailStr]


class VerifiedCreate(BaseModel):
    bank_name: str
    amount: float
    currency_code: str
    reference_number: str
    customs_registration_number: Optional[str]
    importer_id: Optional[int]


class VerifiedOut(VerifiedCreate):
    id: int
    status: str
    created_at: datetime


class BookingCreate(BaseModel):
    importer_id: int
    shipment_id: Optional[int]
    document_type: str
    containers: Optional[List[str]] = []
from typing import Optional, List\nfrom datetime import datetime\nfrom pydantic import BaseModel, EmailStr\n\nclass Token(BaseModel):\n    access_token: str\n    token_type: str = 'bearer'\n\nclass UserCreate(BaseModel):\n    username: str\n    password: str\n    role: str\n\nclass ImporterCreate(BaseModel):\n    name: str\n    customs_registration_number: str\n    contact_email: Optional[EmailStr]\n\nclass VerifiedCreate(BaseModel):\n    bank_name: str\n    amount: float\n    currency_code: str\n    reference_number: str\n    customs_registration_number: Optional[str]\n    importer_id: Optional[int]\n\nclass VerifiedOut(VerifiedCreate):\n    id: int\n    status: str\n    created_at: datetime\n\nclass BookingCreate(BaseModel):\n    importer_id: int\n    shipment_id: Optional[int]\n    document_type: str\n    containers: Optional[List[str]] = []\n
