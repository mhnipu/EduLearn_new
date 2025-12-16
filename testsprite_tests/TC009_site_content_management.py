import requests
import base64
import json
import time
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
TIMEOUT = 30

# Get Supabase anon key from environment
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable must be set")

# Predefined users with credentials and roles to test authorization
USERS = {
    "super_admin": {"email": "superadmin@example.com", "password": "SuperAdminPass123!"},
    "admin": {"email": "admin@example.com", "password": "AdminPass123!"},
    "teacher": {"email": "teacher@example.com", "password": "TeacherPass123!"},
    "student": {"email": "student@example.com", "password": "StudentPass123!"},
    "guardian": {"email": "guardian@example.com", "password": "GuardianPass123!"},
}

def get_auth_token(email: str, password: str) -> str:
    resp = requests.post(
        f"{BASE_URL}/auth/v1/token?grant_type=password",
        headers={"Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY},
        json={"email": email, "password": password, "grant_type": "password"},
        timeout=TIMEOUT,
    )
    assert resp.status_code == 200, f"Login failed for {email} with status {resp.status_code} and body {resp.text}"
    data = resp.json()
    assert "access_token" in data, "No access_token in login response"
    return data["access_token"]

def verify_jwt(token: str):
    # JWT token structure: header.payload.signature
    parts = token.split('.')
    assert len(parts) == 3, "JWT token does not have 3 parts"

    # Decode payload (base64url)
    payload_segment = parts[1]
    padding = '=' * ((4 - len(payload_segment) % 4) % 4)  # pad base64 string
    payload_bytes = base64.urlsafe_b64decode(payload_segment + padding)
    payload = json.loads(payload_bytes.decode('utf-8'))

    # Check standard claims presence
    for claim in ("exp", "iat", "aud", "sub"):
        assert claim in payload, f"JWT claim '{claim}' missing"
    # exp should be in future
    assert payload["exp"] > time.time(), "JWT token expired"
    return payload

def test_site_content_management():
    # Authenticate users and get their access tokens
    tokens = {}
    for role, creds in USERS.items():
        tokens[role] = get_auth_token(creds["email"], creds["password"])
        verify_jwt(tokens[role])

    # Headers template with Bearer token
    def headers(token):
        return {
            "Authorization": f"Bearer {token}",
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY
        }

    # 1. GET /rest/v1/site_content to fetch current content (assumed endpoint)
    #    Accessible by admin and super admin, tests permissions

    # Try to get landing page content with each user role
    for role, token in tokens.items():
        resp = requests.get(f"{BASE_URL}/rest/v1/site_content", headers=headers(token), timeout=TIMEOUT)
        if role in ("super_admin", "admin"):
            assert resp.status_code == 200, f"{role} should access site content, got {resp.status_code}"
            data = resp.json()
            assert isinstance(data, list), "Site content should be a list"
        else:
            # Other roles should be blocked or get empty list/403 depending on RLS policy
            assert resp.status_code in (200, 403), f"{role} unexpected status {resp.status_code}"
            if resp.status_code == 200:
                assert len(resp.json()) == 0, f"{role} should not see site content"

    # 2. POST /rest/v1/site_content to create/update landing page content
    #    Only admin or super_admin allowed
    new_content = {
        "page": "landing",
        "content": "<h1>New Landing Page Content</h1>",
        "theme": "dark",
        "settings": {"show_signup": True}
    }

    # Test unauthorized roles cannot create/update content
    for role in ["teacher", "student", "guardian"]:
        resp = requests.post(f"{BASE_URL}/rest/v1/site_content",
                             headers=headers(tokens[role]),
                             json=new_content,
                             timeout=TIMEOUT)
        assert resp.status_code in (401, 403), f"{role} should not create/update site content"

    # Test admin creates content
    resp = requests.post(f"{BASE_URL}/rest/v1/site_content",
                         headers=headers(tokens["admin"]),
                         json=new_content,
                         timeout=TIMEOUT)
    if resp.status_code == 201:
        # Created new content successfully
        content_id = resp.json().get("id")
    elif resp.status_code == 409:
        # Conflict? Possibly already exists. Fetch to get id to update if supported.
        # Try to GET content and update by PATCH with admin token.
        get_resp = requests.get(f"{BASE_URL}/rest/v1/site_content?select=id&eq.page=landing",
                                headers=headers(tokens["admin"]),
                                timeout=TIMEOUT)
        assert get_resp.status_code == 200
        results = get_resp.json()
        if results:
            content_id = results[0]["id"]
            # Update existing content with PUT/PATCH - assuming PUT here
            update_resp = requests.patch(f"{BASE_URL}/rest/v1/site_content?id=eq.{content_id}",
                                         headers=headers(tokens["admin"]),
                                         json=new_content,
                                         timeout=TIMEOUT)
            assert update_resp.status_code in (200,204), f"Admin update failed with {update_resp.status_code}"
        else:
            # No content found, fail test
            assert False, "Conflict on POST but no existing content found"
    else:
        assert False, f"Admin POST site content failed with status {resp.status_code}"

    # Test super_admin can update content similarly
    resp = requests.post(f"{BASE_URL}/rest/v1/site_content",
                         headers=headers(tokens["super_admin"]),
                         json={"page": "landing", "content": "<h1>SuperAdmin Content</h1>", "theme": "light", "settings": {"show_signup": False}},
                         timeout=TIMEOUT)
    assert resp.status_code in (201, 409)

    # 3. Theme switching test: PATCH site settings with theme change
    # Assuming PATCH endpoint for site settings exists at /rest/v1/site_settings or same /site_content

    # Fetch current site content id for landing page as admin
    resp_get = requests.get(f"{BASE_URL}/rest/v1/site_content?eq.page=landing", headers=headers(tokens["admin"]), timeout=TIMEOUT)
    assert resp_get.status_code == 200
    items = resp_get.json()
    if not items:
        # No landing page content found; fail
        assert False, "No landing page content to update theme"
    content_id = items[0]["id"]

    patch_payload = {
        "theme": "dark"
    }
    resp_patch = requests.patch(f"{BASE_URL}/rest/v1/site_content?id=eq.{content_id}",
                                headers=headers(tokens["admin"]),
                                json=patch_payload,
                                timeout=TIMEOUT)
    assert resp_patch.status_code in (200, 204), f"Failed to patch theme, status {resp_patch.status_code}"

    # Verify unauthorized roles can't PATCH theme
    for role in ["teacher", "student", "guardian"]:
        resp = requests.patch(f"{BASE_URL}/rest/v1/site_content?id=eq.{content_id}",
                              headers=headers(tokens[role]),
                              json=patch_payload,
                              timeout=TIMEOUT)
        assert resp.status_code in (401, 403), f"{role} should not patch site content, got {resp.status_code}"

    # 4. Validate site settings endpoint (if different) secure access

    # Try to fetch site settings as admin and student
    for role in ["admin", "student"]:
        resp = requests.get(f"{BASE_URL}/rest/v1/site_settings", headers=headers(tokens[role]), timeout=TIMEOUT)
        if role == "admin":
            assert resp.status_code == 200
        else:
            assert resp.status_code in (403, 401)

    # 5. Check error responses are informative and consistent for unauthorized attempts
    resp = requests.post(f"{BASE_URL}/rest/v1/site_content",
                         headers=headers(tokens["student"]),
                         json=new_content,
                         timeout=TIMEOUT)
    assert resp.status_code in (401, 403)
    err_data = resp.json() if resp.headers.get("content-type", "").startswith("application/json") else {}
    if err_data:
        assert "message" in err_data or "error" in err_data

test_site_content_management()
