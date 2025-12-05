from fastapi import APIRouter, Depends, HTTPException, status
from sqlmodel import Session, select
from .database import get_session
from . import crud, schemas, models
from .auth import verify_password, create_access_token
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/token")

router = APIRouter()


def get_current_user(token: str = Depends(oauth2_scheme), session: Session = Depends(get_session)):
    from jose import jwt
    from os import getenv
    SECRET_KEY = getenv("JWT_SECRET", "replace-with-secure-secret")
    ALGORITHM = getenv("JWT_ALGORITHM", "HS256")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    except Exception:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    user = crud.get_user_by_username(session, username)
    if not user:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED)
    return user


@router.post("/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), session: Session = Depends(get_session)):
    user = crud.get_user_by_username(session, form_data.username)
    if not user or not verify_password(form_data.password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect username or password")
    access_token = create_access_token(user.username)
    return {"access_token": access_token, "token_type": "bearer"}


@router.post("/users", status_code=201)
def create_user(user_in: schemas.UserCreate, session: Session = Depends(get_session)):
    existing = crud.get_user_by_username(session, user_in.username)
    if existing:
        raise HTTPException(status_code=400, detail="username already exists")
    user = crud.create_user(session, user_in.username, user_in.password, user_in.role)
    return {"id": user.id, "username": user.username, "role": user.role}


@router.post("/importers", status_code=201)
def create_importer(data: schemas.ImporterCreate, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role not in [models.Role.admin, models.Role.customs, models.Role.importer]:
        raise HTTPException(status_code=403)
    try:
        imp = crud.create_importer(session, data)
        return imp
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/importers")
def list_importers(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    return crud.list_importers(session)


@router.post("/verifications", status_code=201)
def submit_verification(vdata: schemas.VerifiedCreate, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role != models.Role.importer:
        raise HTTPException(status_code=403)
    if vdata.amount < 0:
        raise HTTPException(status_code=400, detail="amount must be non-negative")
    ver = crud.submit_verification(session, vdata)
    return ver


@router.get("/verifications/pending")
def pending_verifications(current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role != models.Role.customs:
        raise HTTPException(status_code=403)
    return crud.list_pending_verifications(session)


@router.post("/verifications/{verification_id}/status")
def update_verification_status(verification_id: int, status: str, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role != models.Role.customs:
        raise HTTPException(status_code=403)
    try:
        new_status = models.VerificationStatus(status)
    except Exception:
        raise HTTPException(status_code=400, detail="invalid status")
    ver = crud.set_verification_status(session, verification_id, new_status)
    if not ver:
        raise HTTPException(status_code=404)
    slip = {
        "verification_id": ver.id,
        "reference_number": ver.reference_number,
        "status": ver.status,
        "amount": ver.amount,
        "currency_code": ver.currency_code,
    }
    return {"verification": ver, "slip": slip}


@router.post("/bookings", status_code=201)
def create_booking(bdata: schemas.BookingCreate, current_user: models.User = Depends(get_current_user), session: Session = Depends(get_session)):
    if current_user.role not in [models.Role.importer, models.Role.quay, models.Role.admin]:
        raise HTTPException(status_code=403)
    if bdata.document_type == models.DocumentType.STANDARD:
        stmt = select(models.Verified).where(models.Verified.importer_id == bdata.importer_id, models.Verified.status == models.VerificationStatus.VERIFIED)
        verified = session.exec(stmt).first()
        if not verified:
            raise HTTPException(status_code=400, detail="STANDARD document requires a VERIFIED payment")
    booking = crud.create_booking(session, bdata)
    return booking
