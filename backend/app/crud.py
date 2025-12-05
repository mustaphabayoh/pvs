from sqlmodel import select, Session
from . import models
from .models import User, Importer, Verified, Booking, Container, Shipment, Vessel
from .auth import hash_password

def create_user(session: Session, username: str, password: str, role: str) -> User:
    user = User(username=username, password_hash=hash_password(password), role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def get_user_by_username(session: Session, username: str):
    return session.exec(select(User).where(User.username == username)).first()

def create_importer(session: Session, data) -> Importer:
    importer = Importer(name=data.name, customs_registration_number=data.customs_registration_number, contact_email=data.contact_email)
    session.add(importer)
    session.commit()
    session.refresh(importer)
    return importer

def get_importer(session: Session, importer_id: int):
    return session.get(Importer, importer_id)

def list_importers(session: Session):
    return session.exec(select(Importer)).all()

def submit_verification(session: Session, vdata) -> Verified:
    verified = Verified(
        importer_id=vdata.importer_id,
        bank_name=vdata.bank_name,
        amount=vdata.amount,
        currency_code=vdata.currency_code,
        reference_number=vdata.reference_number,
        customs_registration_number=vdata.customs_registration_number,
    )
    session.add(verified)
    session.commit()
    session.refresh(verified)
    return verified

def list_pending_verifications(session: Session):
    return session.exec(select(Verified).where(Verified.status == models.VerificationStatus.PENDING)).all()

def set_verification_status(session: Session, verification_id: int, status: models.VerificationStatus):
    ver = session.get(Verified, verification_id)
    if not ver:
        return None
    ver.status = status
    session.add(ver)
    session.commit()
    session.refresh(ver)
    return ver

def create_booking(session: Session, bdata) -> Booking:
    booking = Booking(importer_id=bdata.importer_id, shipment_id=bdata.shipment_id, document_type=bdata.document_type)
    session.add(booking)
    session.commit()
    session.refresh(booking)
    # add containers
    for cnum in bdata.containers or []:
        cont = Container(booking_id=booking.id, container_number=cnum)
        session.add(cont)
    session.commit()
    session.refresh(booking)
    return booking
from sqlmodel import select, Session
from . import models
from .models import User, Importer, Verified, Booking, Container, Shipment, Vessel
from .auth import hash_password

def create_user(session: Session, username: str, password: str, role: str) -> User:
    user = User(username=username, password_hash=hash_password(password), role=role)
    session.add(user)
    session.commit()
    session.refresh(user)
    return user

def get_user_by_username(session: Session, username: str):
    return session.exec(select(User).where(User.username == username)).first()

def create_importer(session: Session, data) -> Importer:
    importer = Importer(name=data.name, customs_registration_number=data.customs_registration_number, contact_email=data.contact_email)
    session.add(importer)
    session.commit()
    session.refresh(importer)
    return importer

def get_importer(session: Session, importer_id: int):
    return session.get(Importer, importer_id)

def list_importers(session: Session):
    return session.exec(select(Importer)).all()

def submit_verification(session: Session, vdata) -> Verified:
    verified = Verified(
        importer_id=vdata.importer_id,
        bank_name=vdata.bank_name,
        amount=vdata.amount,
        currency_code=vdata.currency_code,
        reference_number=vdata.reference_number,
        customs_registration_number=vdata.customs_registration_number,
    )
    session.add(verified)
    session.commit()
    session.refresh(verified)
    return verified

def list_pending_verifications(session: Session):
    return session.exec(select(Verified).where(Verified.status == models.VerificationStatus.PENDING)).all()

def set_verification_status(session: Session, verification_id: int, status: models.VerificationStatus):
    ver = session.get(Verified, verification_id)
    if not ver:
        return None
    ver.status = status
    session.add(ver)
    session.commit()
    session.refresh(ver)
    return ver

def create_booking(session: Session, bdata) -> Booking:
    booking = Booking(importer_id=bdata.importer_id, shipment_id=bdata.shipment_id, document_type=bdata.document_type)
    session.add(booking)
    session.commit()
    session.refresh(booking)
    # add containers
    for cnum in bdata.containers or []:
        cont = Container(booking_id=booking.id, container_number=cnum)
        session.add(cont)
    session.commit()
    session.refresh(booking)
    return booking
from sqlmodel import select, Session\nfrom . import models\nfrom .models import User, Importer, Verified, Booking, Container, Shipment, Vessel\nfrom .auth import hash_password\n\ndef create_user(session: Session, username: str, password: str, role: str) -> User:\n    user = User(username=username, password_hash=hash_password(password), role=role)\n    session.add(user)\n    session.commit()\n    session.refresh(user)\n    return user\n\ndef get_user_by_username(session: Session, username: str):\n    return session.exec(select(User).where(User.username == username)).first()\n\ndef create_importer(session: Session, data) -> Importer:\n    importer = Importer(name=data.name, customs_registration_number=data.customs_registration_number, contact_email=data.contact_email)\n    session.add(importer)\n    session.commit()\n    session.refresh(importer)\n    return importer\n\ndef get_importer(session: Session, importer_id: int):\n    return session.get(Importer, importer_id)\n\ndef list_importers(session: Session):\n    return session.exec(select(Importer)).all()\n\ndef submit_verification(session: Session, vdata) -> Verified:\n    verified = Verified(\n        importer_id=vdata.importer_id,\n        bank_name=vdata.bank_name,\n        amount=vdata.amount,\n        currency_code=vdata.currency_code,\n        reference_number=vdata.reference_number,\n        customs_registration_number=vdata.customs_registration_number,\n    )\n    session.add(verified)\n    session.commit()\n    session.refresh(verified)\n    return verified\n\ndef list_pending_verifications(session: Session):\n    return session.exec(select(Verified).where(Verified.status == models.VerificationStatus.PENDING)).all()\n\ndef set_verification_status(session: Session, verification_id: int, status: models.VerificationStatus):\n    ver = session.get(Verified, verification_id)\n    if not ver:\n        return None\n    ver.status = status\n    session.add(ver)\n    session.commit()\n    session.refresh(ver)\n    return ver\n\ndef create_booking(session: Session, bdata) -> Booking:\n    booking = Booking(importer_id=bdata.importer_id, shipment_id=bdata.shipment_id, document_type=bdata.document_type)\n    session.add(booking)\n    session.commit()\n    session.refresh(booking)\n    for cnum in bdata.containers or []:\n        cont = Container(booking_id=booking.id, container_number=cnum)\n        session.add(cont)\n    session.commit()\n    session.refresh(booking)\n    return booking\n
