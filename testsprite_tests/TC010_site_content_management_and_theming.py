import requests
import uuid

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
AUTH_URL = f"{BASE_URL}/auth/v1"
REST_URL = f"{BASE_URL}/rest/v1"
API_KEY = "your-service-role-or-api-key"  # Replace with valid service role key for testing, or use environment variable

HEADERS = {
    "apikey": API_KEY,
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json",
    "Accept": "application/json",
}

TIMEOUT = 30


def test_site_content_management_and_theming():
    """
    Test managing landing page content, themes, and site settings including dark/light theme switching
    and responsive UI components.
    """

    # Supabase RESTful tables assumed: site_contents, site_themes, site_settings
    # This test will:
    # - Create landing page content
    # - Update theme settings (dark/light)
    # - Get site settings and validate responsive UI components flags
    # - Cleanup created content and theme entries after test

    content_id = None
    theme_id = None

    try:
        # 1. Create landing page content
        landing_content_payload = {
            "title": "Test Landing Page",
            "description": "Landing page content for testing theming API",
            "content": "<h1>Welcome to EDulearn Test</h1>",
            "is_active": True,
            "priority": 1,  # assuming field for ordering
        }
        resp = requests.post(
            f"{REST_URL}/site_contents",
            headers=HEADERS,
            json=landing_content_payload,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 201 or resp.status_code == 200, f"Landing content creation failed: {resp.text}"
        content_data = resp.json()
        assert isinstance(content_data, list) and len(content_data) == 1, "Unexpected landing content creation response."
        content_id = content_data[0]["id"]
        assert content_data[0]["title"] == landing_content_payload["title"]

        # 2. Create or update theme - set to dark mode
        theme_payload = {
            "theme_name": "Test Dark Theme " + str(uuid.uuid4()),
            "mode": "dark",
            "primary_color": "#121212",
            "secondary_color": "#bb86fc",
            "background_color": "#000000",
            "font": "Roboto",
            "is_active": True,
        }
        # Insert new theme
        resp = requests.post(
            f"{REST_URL}/site_themes",
            headers=HEADERS,
            json=theme_payload,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 201 or resp.status_code == 200, f"Theme creation failed: {resp.text}"
        theme_data = resp.json()
        assert isinstance(theme_data, list) and len(theme_data) == 1, "Unexpected theme creation response."
        theme_id = theme_data[0]["id"]
        assert theme_data[0]["mode"] == "dark"

        # 3. Switch theme mode to light for the created theme (update)
        update_payload = {
            "mode": "light",
            "primary_color": "#ffffff",
            "background_color": "#f0f0f0",
            "secondary_color": "#6200ee",
        }
        resp = requests.patch(
            f"{REST_URL}/site_themes?id=eq.{theme_id}",
            headers=HEADERS,
            json=update_payload,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 204, f"Theme update failed: {resp.text}"

        # 4. Retrieve and validate updated theme data
        resp = requests.get(
            f"{REST_URL}/site_themes?id=eq.{theme_id}",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        assert resp.status_code == 200, f"Failed to get theme after update: {resp.text}"
        theme_records = resp.json()
        assert len(theme_records) == 1, "Updated theme record not found."
        theme = theme_records[0]
        assert theme["mode"] == "light"
        assert theme["primary_color"] == "#ffffff"

        # 5. Create or update site settings including responsive UI flags
        site_settings_payload = {
            "site_title": "EDulearn Test Site",
            "default_theme_id": theme_id,
            "enable_dark_mode_toggle": True,
            "responsive_ui_enabled": True,
            "updated_at": "now()",  # Assuming DB default or RPC/function
        }
        # Upsert site settings by primary key or create new if none exist
        resp = requests.post(
            f"{REST_URL}/site_settings",
            headers={**HEADERS, "Prefer": "resolution=merge-duplicates"},
            json=site_settings_payload,
            timeout=TIMEOUT,
        )
        assert resp.status_code in (201, 200), f"Site settings creation/upsert failed: {resp.text}"
        site_settings_data = resp.json()
        # site_settings might return list by default
        assert isinstance(site_settings_data, list) and site_settings_data, "Unexpected site settings response."
        settings = site_settings_data[0]
        assert settings["enable_dark_mode_toggle"] is True
        assert settings["responsive_ui_enabled"] is True

        # 6. Query RPC function for current theme mode switch availability (assuming a RPC exists)
        rpc_resp = requests.post(
            f"{REST_URL}/rpc/can_switch_theme",
            headers=HEADERS,
            timeout=TIMEOUT,
        )
        # We expect 200 with boolean result
        assert rpc_resp.status_code == 200, f"RPC can_switch_theme failed: {rpc_resp.text}"
        rpc_result = rpc_resp.json()
        assert isinstance(rpc_result, list) and "can_switch" in rpc_result[0], "RPC result format incorrect."
        assert isinstance(rpc_result[0]["can_switch"], bool), "can_switch should be boolean."

    finally:
        # Clean up test data
        if content_id:
            requests.delete(
                f"{REST_URL}/site_contents?id=eq.{content_id}",
                headers=HEADERS,
                timeout=TIMEOUT,
            )
        if theme_id:
            requests.delete(
                f"{REST_URL}/site_themes?id=eq.{theme_id}",
                headers=HEADERS,
                timeout=TIMEOUT,
            )


test_site_content_management_and_theming()