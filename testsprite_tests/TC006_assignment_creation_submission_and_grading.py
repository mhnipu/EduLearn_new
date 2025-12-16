import requests
import uuid
import os

BASE_URL = "https://pcpiigyuafdzgokiosve.supabase.co"
TIMEOUT = 30

# Get Supabase anon key from environment
SUPABASE_ANON_KEY = os.getenv("SUPABASE_ANON_KEY") or os.getenv("VITE_SUPABASE_PUBLISHABLE_KEY")
if not SUPABASE_ANON_KEY:
    raise ValueError("SUPABASE_ANON_KEY or VITE_SUPABASE_PUBLISHABLE_KEY environment variable must be set")

# Example users for authentication
USERS = {
    "teacher": {"email": "teacher@example.com", "password": "TeacherPass123!"},
    "student": {"email": "student@example.com", "password": "StudentPass123!"},
}

def supabase_sign_in(email: str, password: str):
    url = f"{BASE_URL}/auth/v1/token?grant_type=password"
    headers = {"Content-Type": "application/json", "apikey": SUPABASE_ANON_KEY}
    payload = {"email": email, "password": password}
    resp = requests.post(url, json=payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    data = resp.json()
    assert "access_token" in data
    return data["access_token"]

def create_assignment(token, course_id):
    url = f"{BASE_URL}/rest/v1/assignments"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    assignment_id = str(uuid.uuid4())
    assignment_payload = {
        "id": assignment_id,
        "course_id": course_id,
        "title": "Test Assignment",
        "description": "Assignment created during test",
        "due_date": "2030-12-31T23:59:59Z",
        "status": "created"
    }
    resp = requests.post(url, json=assignment_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201 or resp.status_code == 200
    created = resp.json()
    assert created["id"] == assignment_id
    return created

def submit_assignment(token, assignment_id):
    url = f"{BASE_URL}/rest/v1/assignment_submissions"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    submission_id = str(uuid.uuid4())
    submission_payload = {
        "id": submission_id,
        "assignment_id": assignment_id,
        "content": "Answer contents for the assignment.",
        "status": "submitted"
    }
    resp = requests.post(url, json=submission_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 201 or resp.status_code == 200
    submitted = resp.json()
    assert submitted["id"] == submission_id
    return submitted

def grade_assignment(token, submission_id, grade_value=95):
    url = f"{BASE_URL}/rest/v1/assignment_submissions?id=eq.{submission_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY,
        "Content-Type": "application/json",
        "Accept": "application/json"
    }
    grade_payload = {
        "grade": grade_value,
        "status": "graded",
        "feedback": "Good job on the assignment."
    }
    resp = requests.patch(url, json=grade_payload, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 204
    # Fetch updated submission to verify grading
    get_resp = requests.get(url, headers=headers, timeout=TIMEOUT)
    get_resp.raise_for_status()
    submissions = get_resp.json()
    assert len(submissions) == 1
    submission = submissions[0]
    assert submission["grade"] == grade_value
    assert submission["status"] == "graded"
    return submission

def delete_assignment(token, assignment_id):
    url = f"{BASE_URL}/rest/v1/assignments?id=eq.{assignment_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY,
        "Accept": "application/json"
    }
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 204

def delete_submission(token, submission_id):
    url = f"{BASE_URL}/rest/v1/assignment_submissions?id=eq.{submission_id}"
    headers = {
        "Authorization": f"Bearer {token}",
        "apikey": SUPABASE_ANON_KEY,
        "Accept": "application/json"
    }
    resp = requests.delete(url, headers=headers, timeout=TIMEOUT)
    resp.raise_for_status()
    assert resp.status_code == 204

def test_assignment_creation_submission_and_grading():
    # Sign in users to get tokens
    teacher_token = supabase_sign_in(USERS["teacher"]["email"], USERS["teacher"]["password"])
    student_token = supabase_sign_in(USERS["student"]["email"], USERS["student"]["password"])

    # We need a valid course_id for assignment - create a temp course or query one
    # For test, we try to get one course id from teacher-accessible courses
    courses_url = f"{BASE_URL}/rest/v1/courses"
    headers_teacher = {
        "Authorization": f"Bearer {teacher_token}",
        "apikey": teacher_token,
        "Accept": "application/json"
    }
    resp_courses = requests.get(courses_url, headers=headers_teacher, timeout=TIMEOUT)
    resp_courses.raise_for_status()
    courses = resp_courses.json()
    assert isinstance(courses, list) and len(courses) > 0
    course_id = courses[0]["id"]

    assignment = None
    submission = None

    try:
        # Teacher creates assignment
        assignment = create_assignment(teacher_token, course_id)

        # Student submits assignment
        submission = submit_assignment(student_token, assignment["id"])

        # Teacher grades submission
        graded = grade_assignment(teacher_token, submission["id"], grade_value=88)

        # Validate role-based access control:
        # Student attempting to create assignment should be forbidden (403)
        url = f"{BASE_URL}/rest/v1/assignments"
        headers_student = {
            "Authorization": f"Bearer {student_token}",
            "apikey": student_token,
            "Content-Type": "application/json",
            "Accept": "application/json"
        }
        payload = {
            "id": str(uuid.uuid4()),
            "course_id": course_id,
            "title": "Invalid creation by student",
            "description": "Should not be allowed",
            "due_date": "2030-01-01T12:00:00Z",
            "status": "created"
        }
        resp = requests.post(url, json=payload, headers=headers_student, timeout=TIMEOUT)
        assert resp.status_code in (401, 403)

        # Student trying to grade a submission should be forbidden (403)
        patch_url = f"{BASE_URL}/rest/v1/assignment_submissions?id=eq.{submission['id']}"
        grade_payload = {
            "grade": 50,
            "status": "graded",
            "feedback": "Invalid grade attempt"
        }
        resp = requests.patch(patch_url, json=grade_payload, headers=headers_student, timeout=TIMEOUT)
        assert resp.status_code in (401, 403)

    finally:
        # Cleanup: delete submission and assignment if created
        if submission:
            try:
                delete_submission(teacher_token, submission["id"])
            except Exception:
                pass
        if assignment:
            try:
                delete_assignment(teacher_token, assignment["id"])
            except Exception:
                pass

test_assignment_creation_submission_and_grading()