import requests
import uuid

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
AUTH_URL = f"{BASE_URL}/auth/v1"
REST_URL = f"{BASE_URL}/rest/v1"
TIMEOUT = 30

# These credentials and tokens would typically be securely managed or obtained dynamically.
# For this test, we assume existence of users with roles: student, admin, and teacher.

# Placeholder credentials (would be replaced with valid test users on the system).
CREDENTIALS = {
    "student": {"email": "student@example.com", "password": "password123"},
    "admin": {"email": "admin@example.com", "password": "password123"},
    "teacher": {"email": "teacher@example.com", "password": "password123"},
}

def login(email, password):
    resp = requests.post(
        f"{AUTH_URL}/token",
        json={"email": email, "password": password},
        headers={"Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY},
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    data = resp.json()
    assert "access_token" in data and data["access_token"], "Login failed: access_token missing"
    return data["access_token"], data.get("refresh_token")

def create_course(admin_access_token):
    course_id = str(uuid.uuid4())
    course_payload = {
        "id": course_id,
        "title": f"Test Course {course_id}",
        "description": "Test course for enrollment API",
        "published": False
    }
    headers = {
        "Authorization": f"Bearer {admin_access_token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    resp = requests.post(
        f"{REST_URL}/courses",
        json=course_payload,
        headers=headers,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    created = resp.json()
    assert isinstance(created, list) and len(created) == 1 and created[0]["id"] == course_id
    return course_id

def delete_course(course_id, admin_access_token):
    headers = {"Authorization": f"Bearer {admin_access_token}"}
    resp = requests.delete(
        f"{REST_URL}/courses?id=eq.{course_id}",
        headers=headers,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    # No content or empty array expected on deletion
    assert resp.status_code in (200, 204)

def create_user(role, admin_access_token):
    # Create a user with given role, returns user id and email
    user_id = str(uuid.uuid4())
    user_email = f"{role}_{user_id[:8]}@example.com"
    user_payload = {
        "id": user_id,
        "email": user_email,
        "role": role,
        "password": "password123",
        "confirmed_at": "2025-01-01T00:00:00Z",
        "email_confirmed_at": "2025-01-01T00:00:00Z"
    }
    headers = {
        "Authorization": f"Bearer {admin_access_token}",
        "Content-Type": "application/json",
        "Prefer": "return=representation"
    }
    resp = requests.post(
        f"{REST_URL}/users",
        json=user_payload,
        headers=headers,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    created = resp.json()
    assert isinstance(created, list) and len(created) == 1 and created[0]["id"] == user_id
    return user_id, user_email

def delete_user(user_id, admin_access_token):
    headers = {"Authorization": f"Bearer {admin_access_token}"}
    resp = requests.delete(
        f"{REST_URL}/users?id=eq.{user_id}",
        headers=headers,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    assert resp.status_code in (200, 204)

def enroll_student_self(course_id, student_token):
    headers = {"Authorization": f"Bearer {student_token}", "Content-Type": "application/json"}
    enrollment_payload = {"course_id": course_id}
    resp = requests.post(
        f"{REST_URL}/enrollments",
        json=enrollment_payload,
        headers=headers,
        timeout=TIMEOUT,
    )
    return resp

def enroll_students_bulk(course_id, student_ids, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    enrollments = [{"course_id": course_id, "user_id": uid} for uid in student_ids]
    resp = requests.post(
        f"{REST_URL}/enrollments/bulk",
        json={"enrollments": enrollments},
        headers=headers,
        timeout=TIMEOUT,
    )
    return resp

def admin_enroll_student(course_id, user_id, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}", "Content-Type": "application/json"}
    enrollment_payload = {"course_id": course_id, "user_id": user_id}
    resp = requests.post(
        f"{REST_URL}/enrollments/admin_enroll",
        json=enrollment_payload,
        headers=headers,
        timeout=TIMEOUT,
    )
    return resp

def get_enrollments(course_id, token):
    headers = {"Authorization": f"Bearer {token}"}
    resp = requests.get(
        f"{REST_URL}/enrollments?course_id=eq.{course_id}",
        headers=headers,
        timeout=TIMEOUT,
    )
    resp.raise_for_status()
    return resp.json()

def test_student_enrollment_in_courses():
    # Log in as admin to create course and users
    admin_token, _ = login(CREDENTIALS["admin"]["email"], CREDENTIALS["admin"]["password"])

    # Create a test course
    course_id = create_course(admin_token)

    # Create a new student user for self-enrollment test
    student_id, student_email = None, None
    # Create second student for bulk enrollment test
    student2_id, student2_email = None, None
    try:
        student_id, student_email = create_user("student", admin_token)
        student2_id, student2_email = create_user("student", admin_token)

        # Login as student to get token for self-enrollment
        student_token, _ = login(student_email, "password123")

        # 1) Self-enrollment test by student
        resp = enroll_student_self(course_id, student_token)
        assert resp.status_code == 201 or resp.status_code == 200, f"Self-enrollment failed: {resp.text}"
        enrollment_data = resp.json()
        assert isinstance(enrollment_data, list) and any(e["course_id"] == course_id for e in enrollment_data), "Enrollment data missing or incorrect"

        # 2) Bulk enrollment test by admin
        bulk_resp = enroll_students_bulk(course_id, [student_id, student2_id], admin_token)
        assert bulk_resp.status_code == 200 or bulk_resp.status_code == 201, f"Bulk enrollment failed: {bulk_resp.text}"
        bulk_data = bulk_resp.json()
        assert isinstance(bulk_data, list), "Bulk enrollment response not a list"
        enrolled_user_ids = {enr["user_id"] for enr in bulk_data}
        assert student_id in enrolled_user_ids and student2_id in enrolled_user_ids, "Bulk enrollment missing users"

        # 3) Admin-driven enrollment of a new student user
        # Create a third student user to enrol by admin
        student3_id, student3_email = create_user("student", admin_token)
        admin_enroll_resp = admin_enroll_student(course_id, student3_id, admin_token)
        assert admin_enroll_resp.status_code == 201 or admin_enroll_resp.status_code == 200, f"Admin enroll failed: {admin_enroll_resp.text}"
        admin_enroll_data = admin_enroll_resp.json()
        assert isinstance(admin_enroll_data, list) and any(e["user_id"] == student3_id for e in admin_enroll_data), "Admin enrollment data missing or incorrect"

        # 4) Verify enrollments with admin token (should see all)
        all_enrollments = get_enrollments(course_id, admin_token)
        enrolled_ids = {e["user_id"] for e in all_enrollments}
        assert student_id in enrolled_ids and student2_id in enrolled_ids and student3_id in enrolled_ids, "Enrollments verification failed"

        # 5) Role and policy checks: Try enrolling with a teacher token (should fail)
        teacher_token, _ = login(CREDENTIALS["teacher"]["email"], CREDENTIALS["teacher"]["password"])
        teacher_enroll_resp = enroll_student_self(course_id, teacher_token)
        assert teacher_enroll_resp.status_code in (401, 403), f"Teacher should not be able to self-enroll as student: {teacher_enroll_resp.status_code}"

        # 6) Attempt unenrolled user enrollment without proper role (simulate guardian)
        guardian_id, guardian_email = create_user("guardian", admin_token)
        guardian_token, _ = login(guardian_email, "password123")
        guardian_enroll_resp = enroll_student_self(course_id, guardian_token)
        assert guardian_enroll_resp.status_code in (401, 403), f"Guardian should not be able to self-enroll: {guardian_enroll_resp.status_code}"

        # Clean up guardian user after testing
        delete_user(guardian_id, admin_token)

        # 7) Negative test: unauthenticated enrollment attempt
        unauth_resp = requests.post(
            f"{REST_URL}/enrollments",
            json={"course_id": course_id},
            headers={"Content-Type": "application/json"},
            timeout=TIMEOUT,
        )
        assert unauth_resp.status_code == 401, f"Unauthenticated enrollment request not denied: {unauth_resp.status_code}"

    finally:
        # Cleanup created users and course
        if student_id:
            try:
                delete_user(student_id, admin_token)
            except Exception:
                pass
        if student2_id:
            try:
                delete_user(student2_id, admin_token)
            except Exception:
                pass
        if 'student3_id' in locals() and student3_id:
            try:
                delete_user(student3_id, admin_token)
            except Exception:
                pass
        try:
            delete_course(course_id, admin_token)
        except Exception:
            pass

test_student_enrollment_in_courses()