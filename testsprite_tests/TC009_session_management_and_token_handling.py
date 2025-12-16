import requests
import time

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
AUTH_URL = f"{BASE_URL}/auth/v1"
HEADERS = {"Content-Type": "application/json"}

def test_session_management_and_token_handling():
    timeout = 30
    # Use a test user credential (assuming test credentials exist)
    test_email = "test.session.user@example.com"
    test_password = "TestPassword123!"

    # Step 1: Register a new user (if registration requires admin approval, user may be pending)
    register_payload = {
        "email": test_email,
        "password": test_password
    }
    try:
        # Register user (if already exists, ignore error)
        resp = requests.post(f"{AUTH_URL}/signup", json=register_payload, headers=HEADERS, timeout=timeout)
    except requests.RequestException as e:
        raise AssertionError(f"Registration request failed: {e}")

    assert resp.status_code in (200, 201, 400), f"Unexpected registration status code: {resp.status_code}"
    # 400 could mean user already exists

    # Step 2: Login the user to get access and refresh tokens
    login_payload = {
        "email": test_email,
        "password": test_password
    }
    try:
        resp = requests.post(f"{AUTH_URL}/token?grant_type=password", json=login_payload, headers=HEADERS, timeout=timeout)
    except requests.RequestException as e:
        raise AssertionError(f"Login request failed: {e}")
    assert resp.status_code == 200, f"Login failed with status: {resp.status_code}"
    login_data = resp.json()
    assert "access_token" in login_data, "Access token missing in login response"
    assert "refresh_token" in login_data, "Refresh token missing in login response"
    access_token = login_data["access_token"]
    refresh_token = login_data["refresh_token"]

    auth_headers = {
        "Authorization": f"Bearer {access_token}",
        "Content-Type": "application/json"
    }

    # Step 3: Validate access token usability by calling a protected endpoint (/rest/v1/users)
    try:
        users_resp = requests.get(f"{BASE_URL}/rest/v1/users?select=id,email", headers=auth_headers, timeout=timeout)
    except requests.RequestException as e:
        raise AssertionError(f"Protected endpoint request failed: {e}")
    assert users_resp.status_code == 200, f"Access token not valid for protected endpoint: {users_resp.status_code}"

    # Step 4: Simulate token expiration by waiting or force refresh (Supabase default expires in 60 min, so simulate by refreshing immediately)
    # Step 5: Use refresh token to get a new access token
    refresh_payload = {
        "refresh_token": refresh_token
    }
    try:
        refresh_resp = requests.post(f"{AUTH_URL}/token?grant_type=refresh_token", json=refresh_payload, headers=HEADERS, timeout=timeout)
    except requests.RequestException as e:
        raise AssertionError(f"Token refresh request failed: {e}")
    assert refresh_resp.status_code == 200, f"Refresh token failed with status: {refresh_resp.status_code}"
    refresh_data = refresh_resp.json()
    assert "access_token" in refresh_data, "Access token missing after refresh"
    new_access_token = refresh_data["access_token"]
    new_refresh_token = refresh_data.get("refresh_token", refresh_token)  # Some systems rotate refresh tokens

    # Step 6: Validate new access token works
    new_auth_headers = {
        "Authorization": f"Bearer {new_access_token}",
        "Content-Type": "application/json"
    }
    try:
        new_users_resp = requests.get(f"{BASE_URL}/rest/v1/users?select=id,email", headers=new_auth_headers, timeout=timeout)
    except requests.RequestException as e:
        raise AssertionError(f"Protected endpoint request with refreshed token failed: {e}")
    assert new_users_resp.status_code == 200, "New access token not valid for protected endpoint"

    # Step 7: Test session expiration handling by using an invalidated token (simulate by using an invalid token)
    invalid_auth_headers = {
        "Authorization": "Bearer invalid_or_expired_token",
        "Content-Type": "application/json"
    }
    try:
        expired_resp = requests.get(f"{BASE_URL}/rest/v1/users?select=id,email", headers=invalid_auth_headers, timeout=timeout)
    except requests.RequestException as e:
        raise AssertionError(f"Expired token request failed: {e}")
    # Expect unauthorized error 401 or 403
    assert expired_resp.status_code in (401, 403), f"Expired/invalid token accepted with status: {expired_resp.status_code}"

    # Step 8: Logout user by revoking refresh token (if API supports it)
    # Supabase allows sign out by deleting the session with the refresh token
    try:
        logout_resp = requests.post(f"{AUTH_URL}/logout", json={"refresh_token": new_refresh_token}, headers=HEADERS, timeout=timeout)
    except requests.RequestException as e:
        raise AssertionError(f"Logout request failed: {e}")
    assert logout_resp.status_code == 204, f"Logout failed with status: {logout_resp.status_code}"

    # Step 9: After logout, access token should no longer work
    try:
        post_logout_resp = requests.get(f"{BASE_URL}/rest/v1/users?select=id,email", headers=new_auth_headers, timeout=timeout)
    except requests.RequestException as e:
        raise AssertionError(f"Post logout request failed: {e}")
    # Usually tokens work until expiration, but testing if system invalidates immediately
    # Accept either unauthorized or success but test expects denial ideally
    assert post_logout_resp.status_code in (401, 403), f"Access token still valid after logout with status: {post_logout_resp.status_code}"

test_session_management_and_token_handling()