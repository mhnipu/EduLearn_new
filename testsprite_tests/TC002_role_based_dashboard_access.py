import requests
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
TIMEOUT = 30

# Get Supabase anon key from environment
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable must be set")


def test_role_based_dashboard_access():
    # Test data: users with different roles and their expected dashboard endpoints/features
    users = [
        {
            "email": "admin@example.com",
            "password": "AdminPass123!",
            "role": "admin",
            "expected_dashboard": "/rest/v1/admin_dashboard",
        },
        {
            "email": "teacher@example.com",
            "password": "TeacherPass123!",
            "role": "teacher",
            "expected_dashboard": "/rest/v1/teacher_dashboard",
        },
        {
            "email": "student@example.com",
            "password": "StudentPass123!",
            "role": "student",
            "expected_dashboard": "/rest/v1/student_dashboard",
        },
        {
            "email": "guardian@example.com",
            "password": "GuardianPass123!",
            "role": "guardian",
            "expected_dashboard": "/rest/v1/guardian_dashboard",
        },
    ]

    for user in users:
        # Authenticate user via Supabase auth endpoint
        auth_url = f"{BASE_URL}/auth/v1/token"
        auth_headers = {
            "Content-Type": "application/json",
            "apikey": SUPABASE_ANON_KEY
        }
        auth_payload = {
            "grant_type": "password",
            "email": user["email"],
            "password": user["password"]
        }

        auth_resp = requests.post(auth_url, json=auth_payload, headers=auth_headers, timeout=TIMEOUT)
        assert auth_resp.status_code == 200, f"Login failed for {user['role']} with status {auth_resp.status_code}"
        auth_data = auth_resp.json()
        access_token = auth_data.get("access_token")
        assert access_token, f"Access token missing for {user['role']}"

        # Use access token to get role from user metadata/session or via user endpoint
        headers = {
            "Authorization": f"Bearer {access_token}",
            "apikey": SUPABASE_ANON_KEY,
        }

        # Verify role from /rest/v1/users endpoint with RLS enabled
        user_resp = requests.get(f"{BASE_URL}/rest/v1/users?email=eq.{user['email']}", headers=headers, timeout=TIMEOUT)
        assert user_resp.status_code == 200, f"Could not fetch user info for {user['role']}"
        user_info = user_resp.json()
        assert len(user_info) == 1, f"Unexpected user info length for {user['role']}"
        db_role = user_info[0].get("role") or user_info[0].get("user_role")  # depending on schema naming
        assert db_role == user["role"], f"User role mismatch for {user['role']} expected: {user['role']} got: {db_role}"

        # Access role-based dashboard endpoint to verify access and data correctness
        dashboard_url = f"{BASE_URL}{user['expected_dashboard']}"
        dashboard_resp = requests.get(dashboard_url, headers=headers, timeout=TIMEOUT)
        assert dashboard_resp.status_code == 200, f"Dashboard access failed for {user['role']}"

        dashboard_data = dashboard_resp.json()
        # Basic assertions to verify analytics and quick access features presence in dashboard
        assert isinstance(dashboard_data, dict), "Dashboard data is not a dictionary"
        assert "analytics" in dashboard_data, f"Analytics missing in {user['role']} dashboard"
        assert "quick_access" in dashboard_data, f"Quick access features missing in {user['role']} dashboard"
        # Further detailed feature checks can be made here as needed


test_role_based_dashboard_access()
