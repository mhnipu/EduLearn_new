import requests
import time
import base64
import json
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
TIMEOUT = 30

# Get Supabase anon key from environment
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable must be set")

ADMIN_EMAIL = "superadmin@example.com"
ADMIN_PASSWORD = "SuperAdminPass123!"
STUDENT_EMAIL = "student_test@example.com"
STUDENT_PASSWORD = "StudentPass123!"

def parse_jwt(token):
    try:
        # Decode JWT token payload without verifying signature
        parts = token.split('.')
        if len(parts) != 3:
            return None
        payload_b64 = parts[1]
        # Fix padding
        padding = '=' * (-len(payload_b64) % 4)
        payload_b64 += padding
        decoded_bytes = base64.urlsafe_b64decode(payload_b64)
        return json.loads(decoded_bytes)
    except Exception:
        return None

def test_session_management_and_token_handling():
    session = requests.Session()
    headers = {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json",
        "apikey": SUPABASE_ANON_KEY
    }
    try:
        # 1. SIGNUP a new student user (to test valid signup and token issuance)
        signup_payload = {
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        }
        signup_resp = session.post(
            f"{BASE_URL}/auth/v1/signup",
            data=signup_payload,
            headers=headers,
            timeout=TIMEOUT
        )
        assert signup_resp.status_code in (200, 201), f"Signup failed: {signup_resp.text}"
        signup_data = signup_resp.json()
        assert "access_token" in signup_data, "Signup response missing access_token"
        assert "refresh_token" in signup_data, "Signup response missing refresh_token"
        access_token = signup_data["access_token"]
        refresh_token = signup_data["refresh_token"]
        payload = parse_jwt(access_token)
        assert payload is not None, "Invalid JWT token structure"
        assert "sub" in payload, "JWT missing subject claim"
        assert "exp" in payload, "JWT missing expiration claim"

        # 2. LOGIN using /auth/v1/token with valid credentials
        login_payload = {
            "grant_type": "password",
            "email": STUDENT_EMAIL,
            "password": STUDENT_PASSWORD
        }
        login_resp = session.post(
            f"{BASE_URL}/auth/v1/token",
            data=login_payload,
            headers={"Content-Type": "application/x-www-form-urlencoded", "apikey": SUPABASE_ANON_KEY},
            timeout=TIMEOUT
        )
        assert login_resp.status_code == 200, f"Login failed: {login_resp.text}"
        login_data = login_resp.json()
        assert "access_token" in login_data, "Login response missing access_token"
        assert "refresh_token" in login_data, "Login response missing refresh_token"
        access_token = login_data["access_token"]
        refresh_token = login_data["refresh_token"]
        payload = parse_jwt(access_token)
        assert payload is not None, "Invalid JWT token structure after login"

        # 3. USE refresh token to get new access token (auto-refresh)
        refresh_payload = {
            "grant_type": "refresh_token",
            "refresh_token": refresh_token
        }
        refresh_resp = session.post(
            f"{BASE_URL}/auth/v1/token",
            data=refresh_payload,
            headers={"Content-Type": "application/x-www-form-urlencoded", "apikey": SUPABASE_ANON_KEY},
            timeout=TIMEOUT
        )
        assert refresh_resp.status_code == 200, f"Token refresh failed: {refresh_resp.text}"
        refresh_data = refresh_resp.json()
        new_access_token = refresh_data.get("access_token")
        new_refresh_token = refresh_data.get("refresh_token")
        assert new_access_token is not None, "Refreshed access_token missing"
        assert new_refresh_token is not None, "Refreshed refresh_token missing"
        payload_refresh = parse_jwt(new_access_token)
        assert payload_refresh is not None, "Invalid JWT token after refresh"
        assert payload_refresh["sub"] == payload["sub"], "JWT subject changed after token refresh"

        # 4. PASSWORD RESET flow test
        # Request password reset (assume endpoint exists at /auth/v1/recovery)
        recovery_payload = {
            "email": STUDENT_EMAIL
        }
        recovery_resp = session.post(
            f"{BASE_URL}/auth/v1/recovery",
            json=recovery_payload,
            headers={
                "Content-Type": "application/json",
                "Accept": "application/json",
                "apikey": SUPABASE_ANON_KEY
            },
            timeout=TIMEOUT
        )
        assert recovery_resp.status_code in (200, 204), f"Password reset request failed: {recovery_resp.text}"

        # NOTE: Actual password reset confirmation requires email interaction, skipped here.

        # 5. TOKEN expiration enforcement:
        # For test, parse the exp claim and simulate expiration by waiting if short expiry
        exp = payload.get("exp")
        iat = payload.get("iat", 0)
        now = int(time.time())

        # If token expires in <= 5 seconds, wait for expiration
        if exp and (exp - now) <= 5:
            wait_seconds = (exp - now) + 1
            time.sleep(wait_seconds)

        # Try to use expired token for authorized request (e.g. get courses)
        auth_headers = {"Authorization": f"Bearer {access_token}", "apikey": SUPABASE_ANON_KEY}
        courses_resp = session.get(
            f"{BASE_URL}/rest/v1/courses",
            headers=auth_headers,
            timeout=TIMEOUT
        )
        if exp and (exp <= now):
            # Token expired, expect 401 Unauthorized or 403 Forbidden
            assert courses_resp.status_code in (401, 403), f"Expired token allowed access: {courses_resp.text}"
        else:
            # Token valid, expect 200 OK
            assert courses_resp.status_code == 200, f"Valid token access failed: {courses_resp.text}"

        # 6. SECURITY: Verify token stored securely (simulate secure storage by just checking token format and claims)
        # The test environment can't check client's secure storage; ensure token has claims and no sensitive info leakage
        # Check sensitive claims absence (like plaintext password)
        sensitive_claims = ["password", "pwd", "secret"]
        for claim in sensitive_claims:
            assert claim not in payload, f"Sensitive claim {claim} found in JWT payload"

        # 7. Verify auto-refresh token workflow supports continuous token renewal
        # Simulate multiple refreshes
        last_access_token = new_access_token
        last_refresh_token = new_refresh_token
        for _ in range(2):
            multi_refresh_resp = session.post(
                f"{BASE_URL}/auth/v1/token",
                data={
                    "grant_type": "refresh_token",
                    "refresh_token": last_refresh_token
                },
                headers={"Content-Type": "application/x-www-form-urlencoded", "apikey": SUPABASE_ANON_KEY},
                timeout=TIMEOUT
            )
            assert multi_refresh_resp.status_code == 200, f"Multi refresh failed: {multi_refresh_resp.text}"
            multi_data = multi_refresh_resp.json()
            last_access_token = multi_data.get("access_token")
            last_refresh_token = multi_data.get("refresh_token")
            assert last_access_token is not None, "Multi refresh missing access_token"
            assert last_refresh_token is not None, "Multi refresh missing refresh_token"
            payload_multi = parse_jwt(last_access_token)
            assert payload_multi is not None, "Invalid JWT token after multi refresh"
            assert payload_multi["sub"] == payload["sub"], "JWT subject changed in multi refresh"

    finally:
        # Cleanup: DELETE the created test user via Supabase RPC or admin API (assuming admin token and RPC exist)
        # Login as admin to delete student user
        try:
            admin_login_resp = requests.post(
                f"{BASE_URL}/auth/v1/token",
                data={
                    "grant_type": "password",
                    "email": ADMIN_EMAIL,
                    "password": ADMIN_PASSWORD
                },
                headers={"Content-Type": "application/x-www-form-urlencoded", "apikey": SUPABASE_ANON_KEY},
                timeout=TIMEOUT
            )
            if admin_login_resp.status_code == 200:
                admin_token = admin_login_resp.json().get("access_token")
                headers_admin = {"Authorization": f"Bearer {admin_token}", "apikey": SUPABASE_ANON_KEY}

                # Delete user by invoking RPC or direct delete (assuming users stored in 'auth.users' table)
                # Using PostgREST endpoint DELETE /rest/v1/auth.users?id=eq.<user_id>
                # First, get user ID by email
                user_resp = requests.get(
                    f"{BASE_URL}/rest/v1/auth.users?email=eq.{STUDENT_EMAIL}",
                    headers=headers_admin,
                    timeout=TIMEOUT
                )
                if user_resp.status_code == 200 and user_resp.json():
                    user_id = user_resp.json()[0]["id"]
                    del_resp = requests.delete(
                        f"{BASE_URL}/rest/v1/auth.users?id=eq.{user_id}",
                        headers=headers_admin,
                        timeout=TIMEOUT
                    )
                    assert del_resp.status_code in (204, 200), f"Failed to delete test user: {del_resp.text}"
        except Exception:
            # Suppress cleanup exceptions
            pass

test_session_management_and_token_handling()
