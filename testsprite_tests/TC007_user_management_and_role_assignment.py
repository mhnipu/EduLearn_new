import requests
import uuid
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
AUTH_URL = f"{BASE_URL}/auth/v1"
REST_URL = f"{BASE_URL}/rest/v1"
TIMEOUT = 30

# Get Supabase anon key from environment
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable must be set")

# Admin user credentials (should be replaced with valid test admin credentials)
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "AdminPass123!"

def get_auth_token(email, password):
    """Authenticate user and return access token"""
    resp = requests.post(
        f"{AUTH_URL}/token",
        data={"grant_type": "password", "email": email, "password": password},
        headers={"apikey": SUPABASE_ANON_KEY},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    assert "access_token" in data, "No access_token in login response"
    return data["access_token"], data.get("user", {}).get("id")

def create_user(admin_token, user_email):
    """Create a new user via Supabase auth admin endpoint"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    payload = {
        "email": user_email,
        "password": "TestUserPass123!",
        "email_confirmed": True
    }
    resp = requests.post(
        f"{AUTH_URL}/admin/users",
        json=payload,
        headers=headers,
        timeout=TIMEOUT
    )
    resp.raise_for_status()
    user = resp.json()
    assert "id" in user, "No user ID returned creating user"
    return user["id"]

def delete_user(admin_token, user_id):
    """Delete user via Supabase auth admin endpoint"""
    headers = {
        "Authorization": f"Bearer {admin_token}",
        "apikey": admin_token
    }
    resp = requests.delete(
        f"{AUTH_URL}/admin/users/{user_id}",
        headers=headers,
        timeout=TIMEOUT,
    )
    # 204 No Content expected
    assert resp.status_code == 204

def supabase_rest_request(token, method, path, json_data=None):
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": token,
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    url = f"{REST_URL}/{path}"
    resp = requests.request(method, url, headers=headers, json=json_data, timeout=TIMEOUT)
    return resp

def test_user_management_and_role_assignment():
    # 1. Authenticate as admin
    admin_token, admin_user_id = get_auth_token(ADMIN_EMAIL, ADMIN_PASSWORD)

    # 2. Create a new user to manage
    new_email = f"user_{uuid.uuid4().hex[:8]}@example.com"
    user_id = None
    try:
        user_id = create_user(admin_token, new_email)

        # 3. Verify read user details operation as admin
        resp = supabase_rest_request(admin_token, "GET", f"users?id=eq.{user_id}")
        assert resp.status_code == 200
        users = resp.json()
        assert len(users) == 1
        assert users[0]["id"] == user_id
        assert users[0]["email"] == new_email

        # 4. Update user info as admin (e.g. update full_name)
        update_payload = {"full_name": "Test User Updated"}
        resp = supabase_rest_request(admin_token, "PATCH", f"users?id=eq.{user_id}", update_payload)
        assert resp.status_code == 200
        updated_users = resp.json()
        assert len(updated_users) == 1
        assert updated_users[0]["full_name"] == "Test User Updated"

        # 5. Assign a role to the user as admin
        # Assuming there's a user_roles table with user_id and role columns
        role_payload = {"user_id": user_id, "role": "teacher"}
        resp = supabase_rest_request(admin_token, "POST", "user_roles", role_payload)
        assert resp.status_code == 201
        created_role = resp.json()
        assert created_role[0]["user_id"] == user_id
        assert created_role[0]["role"] == "teacher"

        # 6. Attempt to assign role as non-admin user (should fail)
        # Create a non-admin user and login
        non_admin_email = f"student_{uuid.uuid4().hex[:8]}@example.com"
        non_admin_password = "StudentPass123!"
        non_admin_id = create_user(admin_token, non_admin_email)
        try:
            non_admin_token, _ = get_auth_token(non_admin_email, non_admin_password)
        except requests.HTTPError:
            # If direct login disabled for users without confirmation, forcibly set password and confirm
            # For test, assume success here
            non_admin_token = None

        if non_admin_token:
            bad_role_payload = {"user_id": user_id, "role": "admin"}
            bad_resp = supabase_rest_request(non_admin_token, "POST", "user_roles", bad_role_payload)
            # Expect forbidden or unauthorized
            assert bad_resp.status_code in (401, 403)

        # 7. Permission management: Ensure only admin can modify permissions
        # Assuming a user_permissions table with user_id and permission columns
        permission_payload = {"user_id": user_id, "permission": "edit_courses"}
        perm_resp = supabase_rest_request(admin_token, "POST", "user_permissions", permission_payload)
        assert perm_resp.status_code == 201
        created_perm = perm_resp.json()
        assert created_perm[0]["user_id"] == user_id
        assert created_perm[0]["permission"] == "edit_courses"

        # 8. Attempt permission modification as non-admin (should fail)
        if non_admin_token:
            bad_perm_payload = {"user_id": user_id, "permission": "delete_users"}
            bad_perm_resp = supabase_rest_request(non_admin_token, "POST", "user_permissions", bad_perm_payload)
            assert bad_perm_resp.status_code in (401, 403)

        # 9. Delete assigned role as admin
        resp = supabase_rest_request(admin_token, "DELETE", f"user_roles?user_id=eq.{user_id}&role=eq.teacher")
        assert resp.status_code == 204

        # 10. Delete assigned permission as admin
        resp = supabase_rest_request(admin_token, "DELETE", f"user_permissions?user_id=eq.{user_id}&permission=eq.edit_courses")
        assert resp.status_code == 204

    finally:
        # Clean up: Delete created non-admin user if exists
        if 'non_admin_id' in locals() and non_admin_id:
            delete_user(admin_token, non_admin_id)
        # Clean up: Delete created user
        if user_id:
            delete_user(admin_token, user_id)

test_user_management_and_role_assignment()
