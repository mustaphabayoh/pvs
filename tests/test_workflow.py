from fastapi.testclient import TestClient
from backend.app.main import app


def test_end_to_end_workflow():
    client = TestClient(app)

    # Create users: admin, customs, importer
    r = client.post("/users", json={"username": "admin", "password": "pass", "role": "ADMIN"})
    assert r.status_code == 201
    r = client.post("/users", json={"username": "customs", "password": "pass", "role": "CUSTOMS_OFFICER"})
    assert r.status_code == 201
    r = client.post("/users", json={"username": "imp1", "password": "pass", "role": "IMPORTER"})
    assert r.status_code == 201

    # login importer
    r = client.post("/token", data={"username": "imp1", "password": "pass"})
    assert r.status_code == 200
    token_imp = r.json()["access_token"]
    headers_imp = {"Authorization": f"Bearer {token_imp}"}

    # create importer record
    r = client.post("/importers", json={"name": "ImportCo", "customs_registration_number": "CRN123", "contact_email": "foo@example.com"}, headers=headers_imp)
    assert r.status_code == 201
    importer = r.json()

    # importer submits verification
    vpayload = {"bank_name": "BankA", "amount": 100.0, "currency_code": "USD", "reference_number": "REF123", "customs_registration_number": "CRN123", "importer_id": importer["id"]}
    r = client.post("/verifications", json=vpayload, headers=headers_imp)
    assert r.status_code == 201
    ver = r.json()

    # login customs
    r = client.post("/token", data={"username": "customs", "password": "pass"})
    assert r.status_code == 200
    token_customs = r.json()["access_token"]
    headers_c = {"Authorization": f"Bearer {token_customs}"}

    # list pending
    r = client.get("/verifications/pending", headers=headers_c)
    assert r.status_code == 200
    pending = r.json()
    assert len(pending) >= 1

    # verify
    vid = ver["id"]
    r = client.post(f"/verifications/{vid}/status", json="VERIFIED", headers=headers_c)
    assert r.status_code == 200
    data = r.json()
    assert data["verification"]["status"] == "VERIFIED"

    # create booking (STANDARD) should succeed since verified exists
    r = client.post("/bookings", json={"importer_id": importer["id"], "document_type": "STANDARD", "containers": ["CONT1"]}, headers=headers_imp)
    assert r.status_code == 201
