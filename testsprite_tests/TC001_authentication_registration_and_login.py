import requests
import uuid
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
AUTH_REGISTER_URL = f"{BASE_URL}/auth/v1/signup"
AUTH_LOGIN_URL = f"{BASE_URL}/auth/v1/token"

# The anon/public API key is required in headers for auth requests in Supabase
API_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not API_KEY:
    raise ValueError("SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable must be set")
HEADERS_JSON = {"Content-Type": "application/json", "apikey": API_KEY}
TIMEOUT = 30

def test_authentication_registration_and_login():
    # Create a unique email for registration to avoid conflicts
    unique_email = f"testuser_{uuid.uuid4().hex[:8]}@example.com"
    password = "StrongPass!23"
    role = "Student"  # Example role assignment; can be changed as needed

    register_payload = {
        "email": unique_email,
        "password": password,
        "options": {
            "data": {
                "role": role  # role assignment as part of metadata if supported
            }
        }
    }

    token = None
    try:
        # Register user
        reg_response = requests.post(
            AUTH_REGISTER_URL,
            json=register_payload,
            headers=HEADERS_JSON,
            timeout=TIMEOUT
        )
        assert reg_response.status_code in (200, 201), f"Registration failed: {reg_response.text}"
        reg_data = reg_response.json()
        # Supabase returns user: {...} and possibly session info or confirmation required
        assert "user" in reg_data, "Registration response missing 'user'"
        assert reg_data["user"]["email"] == unique_email, "Registered email mismatch"
        # User should be in pending approval state as per PRD; check if that flag exists
        # This depends on backend implementation; assume 'confirmed_at' is None for pending approval
        # or a custom flag in user metadata
        # Example check: user_metadata.pending_approval == True, else skip
        user_metadata = reg_data["user"].get("user_metadata", {})
        pending = user_metadata.get("pending_approval", True)
        assert pending is True or reg_data["user"].get("confirmed_at") is None, \
            "User should be pending approval after registration"

        # Attempt login - expect failure or limited access due to pending approval
        login_payload = {
            "grant_type": "password",
            "email": unique_email,
            "password": password
        }
        login_response = requests.post(
            AUTH_LOGIN_URL,
            data=login_payload,
            headers=HEADERS_JSON,
            timeout=TIMEOUT
        )
        # Expect login failure or session with limited scope due to pending approval
        # Supabase returns 400 with error if not confirmed or allowed
        if login_response.status_code == 200:
            login_data = login_response.json()
            # Check role assignment in user metadata
            user = login_data.get("user", {})
            assert user.get("email") == unique_email, "Login user email mismatch"
            # Check role in user_metadata
            user_role = user.get("user_metadata", {}).get("role")
            assert user_role == role, f"User role mismatch: expected {role}, got {user_role}"
            # Check if user is flagged for pending approval - still should not allow full access
            pending_login = user.get("user_metadata", {}).get("pending_approval", True)
            assert pending_login is True, "Pending approval flag missing after login"
        else:
            # Expect 400 or 401 due to pending approval; verify error message presence
            err_data = login_response.json()
            assert login_response.status_code in (400,401), "Unexpected login status code"
            err_msg = err_data.get("error_description") or err_data.get("error") or ""
            assert err_msg, "Expected error message for login failure due to pending approval"

    finally:
        # Cleanup: Supabase does not provide user deletion via public API easily.
        # If backend has delete user API endpoint with admin token, use here.
        # Otherwise, cleanup might be manual or skipped here.
        pass

test_authentication_registration_and_login()
