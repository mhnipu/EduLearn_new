# 🎨 Comprehensive CMS System

## Overview

A full-featured Content Management System for managing the EduLearn landing page with:
- **Drag-and-Drop Page Builder** for sections
- **Theme Management** (core and custom themes)
- **Site Settings** configuration
- **Section Editor** for content customization

---

## 🗄️ Database Schema

### Tables Created

1. **`themes`** - Theme management
   - Core themes: `default`, `dark`, `minimal`
   - Custom themes can be created
   - Theme config includes colors, fonts, spacing

2. **`page_sections`** - Page content sections
   - Sections: `hero`, `features`, `testimonials`, `cta`, `custom`
   - Drag-and-drop ordering via `order_index`
   - JSON content storage for flexibility

3. **`site_configurations`** - Site-wide settings
   - Categories: `general`, `appearance`, `seo`, `social`, `email`
   - Key-value pairs with JSON values
   - Public/private configuration support

---

## 🚀 Features

### 1. Page Builder (Drag-and-Drop)

**Location**: `/admin/cms` → **Page Sections** tab

**Features**:
- ✅ View all page sections
- ✅ Reorder sections (up/down arrows)
- ✅ Add new sections (hero, features, testimonials, cta, custom)
- ✅ Edit section content
- ✅ Show/hide sections
- ✅ Delete sections

**Section Types**:
- **Hero**: Main landing section with title, subtitle, CTAs
- **Features**: Feature cards with icons and descriptions
- **Testimonials**: User testimonials (future)
- **CTA**: Call-to-action section
- **Custom**: Custom content blocks

---

### 2. Theme Management

**Location**: `/admin/cms` → **Themes** tab

**Features**:
- ✅ View all themes (core + custom)
- ✅ Activate themes
- ✅ Create custom themes
- ✅ Theme preview (color swatches)
- ✅ Delete custom themes (core themes protected)

**Theme Configuration**:
- **Colors**: Primary, Secondary, Accent, Background, Foreground
- **Fonts**: Heading font, Body font
- **Spacing**: Section padding, Container max-width

**Default Themes**:
- **Default**: Blue primary, modern look
- **Dark**: Dark mode theme
- **Minimal**: Minimalist black/white theme

---

### 3. Site Settings

**Location**: `/admin/cms` → **Settings** tab

**Categories**:

#### General
- Site Name
- Site Tagline

#### Appearance
- Active Theme (managed via Themes tab)

#### SEO
- Meta Description

#### Social Media
- Facebook URL
- Twitter URL
- LinkedIn URL

#### Email
- Contact Email

---

## 📋 How to Use

### Step 1: Apply Migration

1. **Open Supabase Dashboard**:
   ```
   https://supabase.com/dashboard/project/pcpiigyuafdzgokiosve/sql/new
   ```

2. **Copy Migration File**:
   - Open: `supabase/migrations/027_comprehensive_cms_system.sql`
   - Copy all contents

3. **Paste and RUN**

4. **Verify**:
   - Check for success message
   - Default themes and sections should be created

---

### Step 2: Access CMS Manager

1. **Login as Admin/Super Admin**
2. **Go to Admin Dashboard**
3. **Click "CMS Manager"** in Quick Actions
   - Or navigate to: `/admin/cms`

---

### Step 3: Manage Page Sections

1. **Go to "Page Sections" tab**
2. **Add Section**:
   - Click "Add Section"
   - Choose section type
   - Section is created with default content
3. **Edit Section**:
   - Click "Edit" on any section
   - Modify content in the editor
   - Save changes
4. **Reorder Sections**:
   - Use up/down arrows to reorder
   - Order is saved automatically
5. **Show/Hide**:
   - Click eye icon to toggle visibility
6. **Delete**:
   - Click trash icon to remove section

---

### Step 4: Manage Themes

1. **Go to "Themes" tab**
2. **Activate Theme**:
   - Click "Activate" on any theme
   - Theme is applied to landing page
3. **Create Custom Theme**:
   - Fill in theme name and display name
   - Choose colors (color picker + hex input)
   - Click "Create Custom Theme"
4. **Delete Custom Theme**:
   - Click trash icon (only for custom themes)

---

### Step 5: Configure Settings

1. **Go to "Settings" tab**
2. **Navigate through categories**:
   - General: Site name, tagline
   - Appearance: Active theme
   - SEO: Meta description
   - Social: Social media links
   - Email: Contact email
3. **Edit and Save** each configuration

---

## 🎨 Theme System

### Theme Structure

```json
{
  "colors": {
    "primary": "#3b82f6",
    "secondary": "#8b5cf6",
    "accent": "#10b981",
    "background": "#ffffff",
    "foreground": "#0f172a"
  },
  "fonts": {
    "heading": "Inter",
    "body": "Inter"
  },
  "spacing": {
    "section": "py-20",
    "container": "max-w-7xl"
  }
}
```

### Applying Themes

Themes are applied to the landing page via:
- CSS custom properties (future enhancement)
- Inline styles for colors
- Font family application

---

## 📝 Section Content Structure

### Hero Section
```json
{
  "badge": "Modern E-Learning Platform",
  "title_line_1": "Learn Anything,",
  "title_line_2": "Anytime, Anywhere",
  "subtitle": "Access high-quality courses...",
  "cta_primary": {
    "text": "Get Started Free",
    "link": "/auth"
  },
  "cta_secondary": {
    "text": "Browse Courses",
    "link": "/courses"
  }
}
```

### Features Section
```json
{
  "title": "Why Choose EduLearn?",
  "subtitle": "Everything you need...",
  "features": [
    {
      "icon": "BookOpen",
      "title": "Comprehensive Courses",
      "description": "Access thousands..."
    }
  ]
}
```

### CTA Section
```json
{
  "title": "Ready to Start Learning?",
  "subtitle": "Join thousands...",
  "cta_text": "Get Started Free",
  "cta_link": "/auth"
}
```

---

## ✅ Verification Checklist

After applying migration:

- [ ] Migration applied successfully
- [ ] Can access `/admin/cms`
- [ ] Page Sections tab shows default sections
- [ ] Themes tab shows 3 core themes
- [ ] Settings tab shows all categories
- [ ] Can add/edit/delete sections
- [ ] Can create custom themes
- [ ] Can activate themes
- [ ] Landing page displays CMS content
- [ ] Theme changes reflect on landing page

---

## 🐛 Troubleshooting

### Issue: CMS page not accessible

**Solution**:
1. Check user role (must be `admin` or `super_admin`)
2. Verify route exists in `App.tsx`: `/admin/cms`

### Issue: No sections showing

**Solution**:
1. Check migration was applied
2. Verify `page_sections` table has data
3. Check `is_active = true` filter

### Issue: Theme not applying

**Solution**:
1. Verify theme is activated (`is_active = true`)
2. Check `site_configurations` has `active_theme` set
3. Clear browser cache

---

## 📋 Quick Reference

- **CMS Manager**: `/admin/cms`
- **Migration**: `supabase/migrations/027_comprehensive_cms_system.sql`
- **Components**: 
  - `src/components/cms/PageBuilder.tsx`
  - `src/components/cms/ThemeManager.tsx`
  - `src/components/cms/SiteSettings.tsx`
  - `src/components/cms/SectionEditor.tsx`
- **Pages**: 
  - `src/pages/admin/CMSManager.tsx`
  - `src/pages/Landing.tsx` (uses CMS data)

---

**CMS System ready! Manage your landing page with drag-and-drop sections, themes, and settings!** 🎉
