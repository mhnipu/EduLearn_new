import requests
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
AUTH_URL = f"{BASE_URL}/auth/v1"
API_URL = f"{BASE_URL}/rest/v1"
TIMEOUT = 30

# Get Supabase anon key from environment
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable must be set")

# Admin user credentials for authentication to perform course management actions
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "AdminPass123!"


def authenticate(email, password):
    """Authenticate user via Supabase Auth and return access token."""
    resp = requests.post(
        f"{AUTH_URL}/token",
        data={"grant_type": "password", "email": email, "password": password},
        headers={"Content-Type": "application/x-www-form-urlencoded", "apikey": SUPABASE_ANON_KEY},
        timeout=TIMEOUT
    )
    resp.raise_for_status()
    data = resp.json()
    assert "access_token" in data
    assert data.get("token_type") == "bearer"
    return data["access_token"]


def test_course_creation_and_management():
    access_token = authenticate(ADMIN_EMAIL, ADMIN_PASSWORD)
    headers = {
        "Authorization": f"Bearer {access_token}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }

    course_id = None
    module_id = None
    material_id = None

    try:
        # 1. Create a new course
        course_payload = {
            "title": "Test Course API",
            "description": "Course created during automated test for management.",
            "published": False
        }
        resp = requests.post(
            f"{API_URL}/courses",
            headers=headers,
            json=course_payload,
            params={"return": "representation"},
            timeout=TIMEOUT
        )
        assert resp.status_code == 201 or resp.status_code == 200
        course = resp.json()
        assert isinstance(course, list) and len(course) == 1
        course_id = course[0]["id"]
        assert course[0]["title"] == course_payload["title"]

        # 2. Edit the created course
        update_payload = {
            "description": "Updated course description by automated test."
        }
        resp = requests.patch(
            f"{API_URL}/courses?id=eq.{course_id}",
            headers=headers,
            json=update_payload,
            params={"return": "representation"},
            timeout=TIMEOUT
        )
        assert resp.status_code == 200
        updated_course = resp.json()
        assert isinstance(updated_course, list) and len(updated_course) == 1
        assert updated_course[0]["description"] == update_payload["description"]

        # 3. Create a module for the course
        module_payload = {
            "course_id": course_id,
            "title": "Introduction Module",
            "description": "Module created for automated test"
        }
        resp = requests.post(
            f"{API_URL}/modules",
            headers=headers,
            json=module_payload,
            params={"return": "representation"},
            timeout=TIMEOUT
        )
        assert resp.status_code == 201 or resp.status_code == 200
        modules = resp.json()
        assert isinstance(modules, list) and len(modules) == 1
        module_id = modules[0]["id"]
        assert modules[0]["title"] == module_payload["title"]
        assert modules[0]["course_id"] == course_id

        # 4. Edit the created module
        module_update = {
            "description": "Updated module description by automated test"
        }
        resp = requests.patch(
            f"{API_URL}/modules?id=eq.{module_id}",
            headers=headers,
            json=module_update,
            params={"return": "representation"},
            timeout=TIMEOUT
        )
        assert resp.status_code == 200
        updated_module = resp.json()
        assert isinstance(updated_module, list) and len(updated_module) == 1
        assert updated_module[0]["description"] == module_update["description"]

        # 5. Add material to the module
        material_payload = {
            "module_id": module_id,
            "title": "Test Material",
            "type": "video",
            "content_url": "https://example.com/video.mp4"
        }
        resp = requests.post(
            f"{API_URL}/materials",
            headers=headers,
            json=material_payload,
            params={"return": "representation"},
            timeout=TIMEOUT
        )
        assert resp.status_code == 201 or resp.status_code == 200
        materials = resp.json()
        assert isinstance(materials, list) and len(materials) == 1
        material_id = materials[0]["id"]
        assert materials[0]["title"] == material_payload["title"]
        assert materials[0]["type"] == material_payload["type"]

        # 6. Edit the material
        material_update = {
            "title": "Updated Test Material",
            "content_url": "https://example.com/updated-video.mp4"
        }
        resp = requests.patch(
            f"{API_URL}/materials?id=eq.{material_id}",
            headers=headers,
            json=material_update,
            params={"return": "representation"},
            timeout=TIMEOUT
        )
        assert resp.status_code == 200
        updated_material = resp.json()
        assert isinstance(updated_material, list) and len(updated_material) == 1
        assert updated_material[0]["title"] == material_update["title"]

        # 7. Test unauthorized access: try creating a course without token
        resp = requests.post(
            f"{API_URL}/courses",
            headers={"apikey": SUPABASE_ANON_KEY, "Content-Type": "application/json"},
            json=course_payload,
            timeout=TIMEOUT
        )
        # Should be unauthorized or forbidden
        assert resp.status_code in (401, 403)

    finally:
        # Cleanup created resources in reverse order
        if material_id:
            resp = requests.delete(
                f"{API_URL}/materials?id=eq.{material_id}",
                headers=headers,
                timeout=TIMEOUT
            )
            assert resp.status_code in (204, 200, 202, 404)  # 404 means already deleted

        if module_id:
            resp = requests.delete(
                f"{API_URL}/modules?id=eq.{module_id}",
                headers=headers,
                timeout=TIMEOUT
            )
            assert resp.status_code in (204, 200, 202, 404)

        if course_id:
            resp = requests.delete(
                f"{API_URL}/courses?id=eq.{course_id}",
                headers=headers,
                timeout=TIMEOUT
            )
            assert resp.status_code in (204, 200, 202, 404)


test_course_creation_and_management()
