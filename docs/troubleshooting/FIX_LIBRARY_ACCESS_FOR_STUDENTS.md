# 🔧 Fix: Students Cannot See Library Content Attached to Courses

## ❌ Problem
- Books and videos are attached to courses, but students cannot see them
- Course Resources tab shows "No Resources Available" even when books/videos are attached
- Library page shows empty for students even when they're enrolled in courses with library content

## 🔍 Root Cause
1. **RLS Policies**: `has_book_access()` and `has_video_access()` functions don't check course enrollments
2. **Migration Not Applied**: Migration 026 needs to be applied to update these functions
3. **Error Handling**: No error logging to debug RLS issues

---

## ✅ Solution

### Step 1: Apply Migration 026 (CRITICAL)

**File**: `supabase/migrations/026_fix_student_course_access.sql`

**What it does**:
- ✅ Updates `has_book_access()` to check course enrollments
- ✅ Updates `has_video_access()` to check course enrollments
- ✅ Enrolled students can now access books/videos from their courses

**Apply Migration**:
1. Open Supabase Dashboard:
   ```
   https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/sql/new
   ```

2. Copy entire contents of: `supabase/migrations/026_fix_student_course_access.sql`

3. Paste and RUN

4. Verify success message:
   ```
   ✅ has_book_access() function updated to check course enrollments
   ✅ has_video_access() function updated to check course enrollments
   ```

---

### Step 2: Verify Course Library Attachments

**Check if books/videos are attached to courses**:

```sql
-- Check course library books
SELECT 
  clb.course_id,
  c.title as course_title,
  clb.book_id,
  b.title as book_title
FROM course_library_books clb
JOIN courses c ON c.id = clb.course_id
JOIN books b ON b.id = clb.book_id
ORDER BY c.title;

-- Check course library videos
SELECT 
  clv.course_id,
  c.title as course_title,
  clv.video_id,
  v.title as video_title
FROM course_library_videos clv
JOIN courses c ON c.id = clv.course_id
JOIN videos v ON v.id = clv.video_id
ORDER BY c.title;
```

---

### Step 3: Verify Student Enrollment

**Check if student is enrolled**:

```sql
-- Replace 'STUDENT_USER_ID' with actual student user ID
SELECT 
  ce.course_id,
  c.title as course_title,
  ce.enrolled_at
FROM course_enrollments ce
JOIN courses c ON c.id = ce.course_id
WHERE ce.user_id = 'STUDENT_USER_ID';
```

---

### Step 4: Test Access

**After applying migration**:

1. **Login as Student**
2. **Enroll in a course** that has books/videos attached
3. **Go to Course Detail Page** → **Resources Tab**
   - ✅ Should see attached books and videos
   - ✅ Can download/watch if enrolled

4. **Go to Library Page**
   - ✅ Should see books/videos from enrolled courses
   - ✅ Should be able to view/download

---

## 🐛 Troubleshooting

### Issue: Still shows "No Resources Available"

**Check**:
1. ✅ Migration 026 applied? (Check Supabase Dashboard → SQL Editor history)
2. ✅ Books/videos attached to course? (Run SQL queries above)
3. ✅ Student enrolled? (Check enrollment)
4. ✅ Books/videos are `is_active = true`?

**Debug Steps**:
1. Open browser console (F12)
2. Go to Course Resources tab
3. Check console logs:
   - `📚 Fetching books for course: ...`
   - `✅ Fetched books: X`
   - Or `❌ Error fetching books: ...`

### Issue: Library page empty for students

**Check**:
1. ✅ Student enrolled in at least one course?
2. ✅ That course has library content attached?
3. ✅ Check browser console for errors

**Debug Steps**:
1. Open browser console (F12)
2. Go to Library page
3. Check console logs:
   - `📚 Student: Fetching books from enrolled courses...`
   - `✅ Student: Fetched books: X`
   - Or `❌ Error fetching books for student: ...`

### Issue: RLS Policy Error

**If you see RLS errors in console**:

1. **Check RLS policies**:
   ```sql
   SELECT * FROM pg_policies 
   WHERE tablename IN ('books', 'videos', 'course_library_books', 'course_library_videos');
   ```

2. **Verify functions exist**:
   ```sql
   SELECT proname FROM pg_proc 
   WHERE proname IN ('has_book_access', 'has_video_access', 'has_course_access');
   ```

3. **Test function manually**:
   ```sql
   -- Replace with actual values
   SELECT has_book_access('USER_ID', 'BOOK_ID');
   SELECT has_video_access('USER_ID', 'VIDEO_ID');
   SELECT has_course_access('USER_ID', 'COURSE_ID');
   ```

---

## 📋 Quick Fix Checklist

- [ ] Migration 026 applied in Supabase Dashboard
- [ ] Books/videos attached to courses (check `course_library_books`, `course_library_videos`)
- [ ] Student enrolled in courses with library content
- [ ] Books/videos have `is_active = true`
- [ ] Browser console checked for errors
- [ ] Tested as student user (not admin/teacher)

---

## ✅ Expected Behavior After Fix

### Course Resources Tab
- ✅ Shows all books attached to course
- ✅ Shows all videos attached to course
- ✅ Enrolled students can download/watch
- ✅ Non-enrolled users see content but buttons are disabled

### Library Page (Students)
- ✅ Shows only books/videos from enrolled courses
- ✅ Can view/download content
- ✅ Filtered by category and search

### Library Page (Admins/Teachers)
- ✅ Shows all books/videos
- ✅ Full access to all content

---

**Apply Migration 026 to fix library access for students!** 🚀
