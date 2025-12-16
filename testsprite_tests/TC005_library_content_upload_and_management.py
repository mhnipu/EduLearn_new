import requests
import uuid
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
AUTH_URL = f"{BASE_URL}/auth/v1"
REST_URL = f"{BASE_URL}/rest/v1"
STORAGE_URL = f"{BASE_URL}/storage/v1"

# Test admin user credentials (assumed to exist and authorized for library content management)
ADMIN_EMAIL = "admin@example.com"
ADMIN_PASSWORD = "AdminPass123!"

SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY")
assert SUPABASE_ANON_KEY, "SUPABASE_ANON_KEY environment variable must be set"

def test_library_content_upload_and_management():
    """
    Test the content library APIs for uploading, viewing, and managing PDF and video content ensuring only authorized roles can perform these actions.
    """

    headers_auth = {
        "Content-Type": "application/json",
        "apikey": SUPABASE_ANON_KEY
    }
    session = requests.Session()

    # Authenticate as Admin to get access token
    auth_resp = session.post(
        f"{AUTH_URL}/token",
        headers=headers_auth,
        json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD},
        timeout=30,
    )
    assert auth_resp.status_code == 200, f"Auth failed: {auth_resp.text}"

    auth_data = auth_resp.json()
    access_token = auth_data.get("access_token")
    assert access_token, "No access token returned"

    # Common headers with authorization for subsequent REST and Storage calls
    headers = {
        "Authorization": f"Bearer {access_token}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json",
    }

    # --- Step 1: Upload PDF file to storage
    bucket_id = "library-content"
    pdf_file_content = b"%PDF-1.4 test pdf content"  # minimal PDF header content as dummy file
    # Generate unique file key
    pdf_file_key = f"test_uploads/{uuid.uuid4()}.pdf"

    # Upload PDF via Storage API (POST to /object/{bucket}/path)
    upload_pdf_resp = session.post(
        f"{STORAGE_URL}/object/{bucket_id}/{pdf_file_key}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "application/pdf",
        },
        data=pdf_file_content,
        timeout=30,
    )
    assert upload_pdf_resp.status_code in (200, 201), f"PDF upload failed: {upload_pdf_resp.text}"

    # --- Step 2: Upload Video file to storage
    video_file_content = b"\x00\x00\x00\x18ftypmp42"  # minimal mp4 header as dummy file
    video_file_key = f"test_uploads/{uuid.uuid4()}.mp4"

    upload_video_resp = session.post(
        f"{STORAGE_URL}/object/{bucket_id}/{video_file_key}",
        headers={
            "Authorization": f"Bearer {access_token}",
            "Content-Type": "video/mp4",
        },
        data=video_file_content,
        timeout=30,
    )
    assert upload_video_resp.status_code in (200, 201), f"Video upload failed: {upload_video_resp.text}"

    # --- Step 3: Insert metadata for PDF into Postgres table (library contents)
    library_table = "library_contents"

    pdf_metadata = {
        "title": "Test PDF Document",
        "content_type": "pdf",
        "storage_path": pdf_file_key,
        "description": "Test PDF upload for automated test",
    }
    # Insert PDF metadata
    insert_pdf_resp = session.post(
        f"{REST_URL}/{library_table}",
        headers=headers,
        json=pdf_metadata,
        timeout=30,
    )
    assert insert_pdf_resp.status_code == 201, f"Insert PDF metadata failed: {insert_pdf_resp.text}"
    pdf_entry = insert_pdf_resp.json()
    pdf_id = pdf_entry.get("id")
    assert pdf_id, "No ID returned for PDF entry"

    # --- Step 4: Insert metadata for Video into Postgres table
    video_metadata = {
        "title": "Test Video Content",
        "content_type": "video",
        "storage_path": video_file_key,
        "description": "Test video upload for automated test",
    }
    insert_video_resp = session.post(
        f"{REST_URL}/{library_table}",
        headers=headers,
        json=video_metadata,
        timeout=30,
    )
    assert insert_video_resp.status_code == 201, f"Insert Video metadata failed: {insert_video_resp.text}"
    video_entry = insert_video_resp.json()
    video_id = video_entry.get("id")
    assert video_id, "No ID returned for Video entry"

    try:
        # --- Step 5: View uploaded PDF content metadata via GET
        get_pdf_resp = session.get(
            f"{REST_URL}/{library_table}?id=eq.{pdf_id}",
            headers=headers,
            timeout=30,
        )
        assert get_pdf_resp.status_code == 200, f"Get PDF metadata failed: {get_pdf_resp.text}"
        pdf_contents = get_pdf_resp.json()
        assert len(pdf_contents) == 1, "PDF metadata not found"
        assert pdf_contents[0]["content_type"] == "pdf", "Content type mismatch for PDF"

        # --- Step 6: View uploaded Video content metadata via GET
        get_video_resp = session.get(
            f"{REST_URL}/{library_table}?id=eq.{video_id}",
            headers=headers,
            timeout=30,
        )
        assert get_video_resp.status_code == 200, f"Get Video metadata failed: {get_video_resp.text}"
        video_contents = get_video_resp.json()
        assert len(video_contents) == 1, "Video metadata not found"
        assert video_contents[0]["content_type"] == "video", "Content type mismatch for Video"

        # --- Step 7: Update PDF content metadata (description change)
        updated_description = "Updated PDF description for test"
        update_pdf_resp = session.patch(
            f"{REST_URL}/{library_table}?id=eq.{pdf_id}",
            headers=headers,
            json={"description": updated_description},
            timeout=30,
        )
        assert update_pdf_resp.status_code in (200, 204), f"Update PDF metadata failed: {update_pdf_resp.text}"

        # Verify update
        verify_pdf_resp = session.get(
            f"{REST_URL}/{library_table}?id=eq.{pdf_id}",
            headers=headers,
            timeout=30,
        )
        assert verify_pdf_resp.status_code == 200, f"Verify PDF update failed: {verify_pdf_resp.text}"
        verify_pdf = verify_pdf_resp.json()
        assert verify_pdf[0]["description"] == updated_description, "PDF description update unsuccessful"

        # --- Step 8: Attempt unauthorized action as non-authorized role (simulate)
        # For this test, we'll attempt with an invalid token to simulate unauthorized user
        unauthorized_headers = {
            "Authorization": "Bearer invalidtoken",
            "apikey": SUPABASE_ANON_KEY,
            "Content-Type": "application/json",
            "Accept": "application/json",
        }
        unauthorized_resp = session.post(
            f"{REST_URL}/{library_table}",
            headers=unauthorized_headers,
            json={
                "title": "Unauthorized Upload",
                "content_type": "pdf",
                "storage_path": "some/path.pdf",
            },
            timeout=30,
        )
        assert unauthorized_resp.status_code in (401, 403), "Unauthorized upload should be rejected"

    finally:
        # Cleanup inserted entries and uploaded files

        # Delete PDF metadata entry
        del_pdf_meta = session.delete(
            f"{REST_URL}/{library_table}?id=eq.{pdf_id}",
            headers=headers,
            timeout=30,
        )
        assert del_pdf_meta.status_code in (200, 204), f"Failed to delete PDF metadata: {del_pdf_meta.text}"

        # Delete video metadata entry
        del_video_meta = session.delete(
            f"{REST_URL}/{library_table}?id=eq.{video_id}",
            headers=headers,
            timeout=30,
        )
        assert del_video_meta.status_code in (200, 204), f"Failed to delete video metadata: {del_video_meta.text}"

        # Delete uploaded PDF file
        del_pdf_file = session.delete(
            f"{STORAGE_URL}/object/{bucket_id}/{pdf_file_key}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        assert del_pdf_file.status_code in (200, 204), f"Failed to delete PDF file: {del_pdf_file.text}"

        # Delete uploaded Video file
        del_video_file = session.delete(
            f"{STORAGE_URL}/object/{bucket_id}/{video_file_key}",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=30,
        )
        assert del_video_file.status_code in (200, 204), f"Failed to delete video file: {del_video_file.text}"

test_library_content_upload_and_management()
