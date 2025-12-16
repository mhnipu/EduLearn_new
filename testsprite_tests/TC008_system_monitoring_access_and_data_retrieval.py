import requests
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
TIMEOUT = 30

# Get Supabase anon key from environment
ANON_API_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not ANON_API_KEY:
    raise ValueError("SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable must be set")

# Sample admin and super admin credentials for authentication
ADMIN_CREDENTIALS = {
    "email": "admin@example.com",
    "password": "AdminPass123!"
}
SUPER_ADMIN_CREDENTIALS = {
    "email": "superadmin@example.com",
    "password": "SuperAdminPass123!"
}
NON_ADMIN_CREDENTIALS = {
    "email": "teacher@example.com",
    "password": "TeacherPass123!"
}

def supabase_auth_signin(email, password):
    url = f"{BASE_URL}/auth/v1/token?grant_type=password"
    headers = {"Content-Type": "application/json", "apikey": ANON_API_KEY}
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    return resp.json()

def get_system_monitoring_data(jwt_token):
    url = f"{BASE_URL}/rest/v1/system_monitoring"
    headers = {
        "Authorization": f"Bearer {jwt_token}",
        "apikey": ANON_API_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    return resp

def test_system_monitoring_access_and_data_retrieval():
    # Authenticate Admin user
    admin_auth = supabase_auth_signin(ADMIN_CREDENTIALS["email"], ADMIN_CREDENTIALS["password"])
    admin_token = admin_auth.get("access_token")
    assert admin_token is not None, "Admin authentication failed: no access token returned."

    # Authenticate Super Admin user
    super_admin_auth = supabase_auth_signin(SUPER_ADMIN_CREDENTIALS["email"], SUPER_ADMIN_CREDENTIALS["password"])
    super_admin_token = super_admin_auth.get("access_token")
    assert super_admin_token is not None, "Super Admin authentication failed: no access token returned."

    # Authenticate Non-Admin user
    non_admin_auth = supabase_auth_signin(NON_ADMIN_CREDENTIALS["email"], NON_ADMIN_CREDENTIALS["password"])
    non_admin_token = non_admin_auth.get("access_token")
    assert non_admin_token is not None, "Non Admin authentication failed: no access token returned."

    # Admin access to system monitoring endpoint
    admin_response = get_system_monitoring_data(admin_token)
    assert admin_response.status_code == 200, f"Admin should have access. Got status {admin_response.status_code}"
    admin_json = admin_response.json()
    assert isinstance(admin_json, list), "Admin response should be a JSON list of performance analytics."
    assert len(admin_json) > 0, "Admin response should contain performance analytics data."
    required_keys = {"cpu_usage", "memory_usage", "disk_space", "uptime", "health_status"}
    for item in admin_json:
        assert required_keys.issubset(item.keys()), "Admin response missing required health indicator keys."

    # Super Admin access to system monitoring endpoint
    super_admin_response = get_system_monitoring_data(super_admin_token)
    assert super_admin_response.status_code == 200, f"Super Admin should have access. Got status {super_admin_response.status_code}"
    super_admin_json = super_admin_response.json()
    assert isinstance(super_admin_json, list), "Super Admin response should be a JSON list of performance analytics."
    assert len(super_admin_json) > 0, "Super Admin response should contain performance analytics data."
    for item in super_admin_json:
        assert required_keys.issubset(item.keys()), "Super Admin response missing required health indicator keys."

    # Non-Admin access to system monitoring endpoint should be forbidden or unauthorized
    non_admin_response = get_system_monitoring_data(non_admin_token)
    assert non_admin_response.status_code in (401, 403), f"Non admin should NOT have access. Got status {non_admin_response.status_code}"

test_system_monitoring_access_and_data_retrieval()