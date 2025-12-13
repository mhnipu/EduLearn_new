# 📚 Library Content Edit Feature - Complete Implementation

## 📋 Overview

This document describes the complete implementation of edit functionality for library content (books and videos) with proper access control, audit trails, and concurrent edit prevention.

---

## 🎯 Features Implemented

### 1. **Admin Edit Capabilities**
- ✅ Edit all book fields (title, author, description, PDF URL, thumbnail, category, tags, etc.)
- ✅ Edit all video fields (title, description, YouTube URL, thumbnail, category, tags, duration)
- ✅ Toggle active/inactive status (soft delete)
- ✅ Module permission-based access control

### 2. **Audit Trail / Version Control**
- ✅ Complete edit history logged in `library_edit_history` table
- ✅ Tracks previous and new values for all fields
- ✅ Records who edited and when
- ✅ Lists specific fields that changed
- ✅ Optional edit reason/notes field

### 3. **Concurrent Edit Prevention**
- ✅ Edit lock system prevents simultaneous edits
- ✅ 15-minute lock timeout
- ✅ Automatic lock cleanup
- ✅ Lock extend on activity
- ✅ User-friendly error messages

### 4. **Security & Access Control**
- ✅ Super Admin: Full edit access
- ✅ Admin: Edit access with `library` module `update` permission
- ✅ RLS policies at database level
- ✅ Frontend validation
- ✅ Audit trail for compliance

---

## 🗄️ Database Schema

### New Tables Created

#### 1. `library_edit_history`
```sql
CREATE TABLE public.library_edit_history (
  id uuid PRIMARY KEY,
  content_type text NOT NULL,  -- 'book' or 'video'
  content_id uuid NOT NULL,
  edited_by uuid NOT NULL REFERENCES auth.users(id),
  edited_at timestamptz DEFAULT now(),
  previous_values jsonb NOT NULL,
  new_values jsonb NOT NULL,
  changed_fields text[] NOT NULL,
  edit_reason text,
  edit_session_id uuid,
  created_at timestamptz DEFAULT now()
);
```

**Purpose**: Complete audit trail of all edits

**RLS Policies**:
- Admins/Super Admins can view
- System auto-inserts via trigger

#### 2. `library_edit_locks`
```sql
CREATE TABLE public.library_edit_locks (
  id uuid PRIMARY KEY,
  content_type text NOT NULL,  -- 'book' or 'video'
  content_id uuid NOT NULL,
  locked_by uuid NOT NULL REFERENCES auth.users(id),
  locked_at timestamptz DEFAULT now(),
  expires_at timestamptz DEFAULT (now() + interval '15 minutes'),
  UNIQUE(content_type, content_id)
);
```

**Purpose**: Prevent concurrent edits

**RLS Policies**:
- Admins can view locks
- Admins can create/delete own locks

---

## 🔐 Enhanced RLS Policies

### Books Table

```sql
-- Old policy (removed):
CREATE POLICY "Only admins can update books"
  USING (is_admin_or_higher(auth.uid()));

-- New policy (module permission check):
CREATE POLICY "admins_with_library_permission_can_update_books"
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin') OR
    (has_role(auth.uid(), 'admin') AND check_module_permission(auth.uid(), 'library', 'update'))
  );
```

### Videos Table

```sql
-- Same pattern as books
CREATE POLICY "admins_with_library_permission_can_update_videos"
  FOR UPDATE
  USING (
    has_role(auth.uid(), 'super_admin') OR
    (has_role(auth.uid(), 'admin') AND check_module_permission(auth.uid(), 'library', 'update'))
  );
```

**Key Changes**:
- ✅ Super Admin: Always allowed
- ✅ Admin: Must have `library` module `update` permission
- ✅ Integrated with new RBAC system

---

## ⚙️ Auto-Logging Triggers

### Book Edit Trigger
```sql
CREATE TRIGGER trigger_log_book_edit
  BEFORE UPDATE ON public.books
  FOR EACH ROW
  EXECUTE FUNCTION public.log_book_edit();
```

**Behavior**:
- Detects which fields changed
- Logs previous and new values as JSONB
- Stores change in `library_edit_history`
- Updates `updated_at` timestamp automatically

### Video Edit Trigger
```sql
CREATE TRIGGER trigger_log_video_edit
  BEFORE UPDATE ON public.videos
  FOR EACH ROW
  EXECUTE FUNCTION public.log_video_edit();
```

**Behavior**: Same as book trigger

---

## 🔧 Helper Functions

### 1. `acquire_edit_lock()`
```typescript
const { data } = await supabase.rpc('acquire_edit_lock', {
  _content_type: 'book',  // or 'video'
  _content_id: bookId
});

if (data.success) {
  // Lock acquired, proceed with edit
} else {
  // Locked by another user
  console.log(data.error);
}
```

**Returns**:
```json
{
  "success": true/false,
  "lock_id": "uuid",
  "message": "Lock acquired/extended",
  "error": "Content is being edited by another user" (if failed)
}
```

### 2. `release_edit_lock()`
```typescript
await supabase.rpc('release_edit_lock', {
  _content_type: 'book',
  _content_id: bookId
});
```

**Behavior**: Releases lock when user closes edit dialog or navigates away

---

## 🖥️ Frontend Components

### 1. `EditBookDialog.tsx`

**Location**: `src/components/library/EditBookDialog.tsx`

**Features**:
- Full form with all book fields
- Category selection dropdown
- Tags input (comma-separated)
- Active/inactive checkbox
- Lock acquisition on open
- Lock release on close
- Real-time lock status display
- Toast notifications

**Usage**:
```tsx
import { EditBookDialog } from '@/components/library/EditBookDialog';

function LibraryManagement() {
  const [selectedBook, setSelectedBook] = useState<Book | null>(null);
  const [isEditOpen, setIsEditOpen] = useState(false);
  
  const handleEdit = (book: Book) => {
    setSelectedBook(book);
    setIsEditOpen(true);
  };
  
  const handleEditSuccess = () => {
    // Refresh book list
    fetchBooks();
  };
  
  return (
    <>
      {/* Book list with edit button */}
      <Button onClick={() => handleEdit(book)}>Edit</Button>
      
      <EditBookDialog
        book={selectedBook}
        isOpen={isEditOpen}
        onClose={() => setIsEditOpen(false)}
        onSuccess={handleEditSuccess}
      />
    </>
  );
}
```

### 2. `EditVideoDialog.tsx`

**Location**: `src/components/library/EditVideoDialog.tsx`

**Features**: Same as `EditBookDialog` but for videos

**Usage**: Same pattern as `EditBookDialog`

---

## 🚀 Implementation Steps

### Step 1: Apply Database Migration
```bash
# Open SQL Editor:
https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/sql/new

# Run migration:
supabase/migrations/025_library_edit_enhancement.sql
```

Expected output:
```
✅ Audit trail table created
✅ Edit lock system created
✅ Enhanced RLS policies with module permissions
✅ Auto-logging triggers created
✅ Helper functions for concurrent edit prevention
```

### Step 2: Grant Library Module Permissions to Admins

As Super Admin:
1. Go to `/admin/super`
2. Select an Admin user
3. Click "Edit Permissions"
4. Find "library" module
5. Grant: `can_read`, `can_update` (and optionally `can_delete`)

### Step 3: Integrate Edit Components

Add edit buttons to your existing library management pages:

```tsx
// Example: In your library page
import { EditBookDialog } from '@/components/library/EditBookDialog';
import { EditVideoDialog } from '@/components/library/EditVideoDialog';

// Add edit buttons to your book/video cards
<Button 
  size="sm" 
  variant="outline"
  onClick={() => {
    setSelectedBook(book);
    setIsEditDialogOpen(true);
  }}
>
  <Edit className="h-4 w-4 mr-2" />
  Edit
</Button>
```

### Step 4: Test the Feature

1. **Test as Super Admin**:
   - Login: `super@gmail.com / 445500`
   - Navigate to library management
   - Click "Edit" on a book/video
   - Modify fields
   - Save changes
   - Verify changes applied

2. **Test as Admin**:
   - Create/login as Admin user
   - Ensure they have `library` module `update` permission
   - Try editing a book/video
   - Should work if permission granted

3. **Test Concurrent Edits**:
   - Open edit dialog for same book in 2 browser tabs
   - First tab: Lock acquired
   - Second tab: Should show "Locked by another user" error

4. **Test Audit Trail**:
   ```sql
   -- View edit history
   SELECT * FROM public.library_edit_history
   ORDER BY edited_at DESC;
   ```

---

## 🔒 Security Considerations

### 1. **Database Level Enforcement**
✅ RLS policies prevent unauthorized edits even if frontend bypassed
✅ Module permission checks at database level
✅ Audit trail cannot be deleted (no DELETE policy)

### 2. **Privilege Escalation Prevention**
✅ Admin needs explicit `library.update` permission
✅ Super Admin cannot be locked out (always has access)

### 3. **Data Integrity**
✅ Triggers run BEFORE UPDATE (can validate/modify)
✅ Automatic `updated_at` timestamp
✅ Previous values preserved in audit log

### 4. **Concurrent Edit Prevention**
✅ Database-level UNIQUE constraint on locks
✅ Automatic lock expiration
✅ Lock cleanup on expired entries

---

## 🔍 Handling Concurrent Edits

### Scenario 1: User A editing, User B tries to edit
```
1. User A opens edit dialog
2. System acquires lock for User A
3. User B opens edit dialog
4. System checks lock → locked by User A
5. User B sees error: "Content is being edited by another user"
6. User B cannot edit (form disabled)
```

### Scenario 2: User A's lock expires
```
1. User A opens edit dialog
2. 15 minutes pass (User A idle)
3. Lock expires automatically
4. User B opens edit dialog
5. System acquires lock for User B (old lock expired)
6. User A tries to save → error "Lock expired"
7. User A must re-open dialog to get new lock
```

### Scenario 3: User A closes dialog
```
1. User A opens edit dialog
2. Lock acquired
3. User A clicks "Cancel" or closes dialog
4. `release_edit_lock()` called automatically
5. Lock removed from database
6. User B can now edit immediately
```

---

## 📊 Viewing Edit History

### SQL Query:
```sql
-- View recent edits
SELECT 
  leh.content_type,
  CASE 
    WHEN leh.content_type = 'book' THEN b.title
    WHEN leh.content_type = 'video' THEN v.title
  END as content_title,
  p.full_name as edited_by_name,
  leh.changed_fields,
  leh.edited_at
FROM public.library_edit_history leh
LEFT JOIN public.books b ON leh.content_type = 'book' AND leh.content_id = b.id
LEFT JOIN public.videos v ON leh.content_type = 'video' AND leh.content_id = v.id
LEFT JOIN public.profiles p ON leh.edited_by = p.id
ORDER BY leh.edited_at DESC
LIMIT 50;
```

### View Specific Changes:
```sql
-- See what changed for a specific book
SELECT 
  edited_at,
  changed_fields,
  previous_values->>'title' as old_title,
  new_values->>'title' as new_title,
  previous_values->>'author' as old_author,
  new_values->>'author' as new_author
FROM public.library_edit_history
WHERE content_type = 'book' 
  AND content_id = 'book-uuid-here'
ORDER BY edited_at DESC;
```

---

## ✅ Testing Checklist

- [ ] Super Admin can edit all books/videos
- [ ] Admin with permission can edit
- [ ] Admin without permission cannot edit (RLS denies)
- [ ] Edit locks prevent concurrent edits
- [ ] Lock expires after 15 minutes
- [ ] Lock is released on dialog close
- [ ] All edits logged in `library_edit_history`
- [ ] Changed fields correctly detected
- [ ] Previous/new values correctly stored
- [ ] `updated_at` timestamp updates automatically
- [ ] Frontend shows lock error when locked by another user
- [ ] Toast notifications work correctly
- [ ] Form validation works (required fields)
- [ ] Category dropdown populated
- [ ] Tags save as array
- [ ] Active/inactive toggle works

---

## 🆘 Troubleshooting

### Issue: "Permission denied" when editing
**Solution**: Ensure admin has `library` module `update` permission:
```sql
-- Check permissions
SELECT * FROM public.user_module_permissions ump
JOIN public.modules m ON m.id = ump.module_id
WHERE ump.user_id = 'admin-user-id' AND m.name = 'library';

-- Grant if missing (as Super Admin via UI)
```

### Issue: "Content is locked" always shows
**Solution**: Clean up stale locks:
```sql
-- Manual cleanup
DELETE FROM public.library_edit_locks
WHERE expires_at < now();
```

### Issue: Edit history not logging
**Solution**: Check trigger exists:
```sql
-- Verify trigger
SELECT * FROM pg_trigger 
WHERE tgname IN ('trigger_log_book_edit', 'trigger_log_video_edit');

-- Re-run migration if missing
```

---

## 📖 Summary

This implementation provides a complete, production-ready edit feature for library content with:

✅ **Full CRUD capabilities** for admins
✅ **Granular permission control** via RBAC modules
✅ **Complete audit trail** for compliance
✅ **Concurrent edit prevention** for data integrity
✅ **User-friendly UI** with real-time feedback
✅ **Security at database level** (RLS)

All features are backwards compatible and integrate seamlessly with your existing RBAC system!
