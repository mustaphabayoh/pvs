from fastapi import FastAPI
from .database import init_db
from . import api
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Customs Payment Verification System")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
def on_startup():
    init_db()


app.include_router(api.router)
