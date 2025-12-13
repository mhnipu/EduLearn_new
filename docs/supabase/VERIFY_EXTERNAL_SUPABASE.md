# ✅ External Supabase Verification Guide

এই গাইড আপনাকে সাহায্য করবে আপনার project সম্পূর্ণভাবে external Supabase database ব্যবহার করছে কিনা verify করতে।

---

## 🔍 Step 1: Environment Variables Check

### `.env` File তৈরি করুন

Project root এ `.env` file তৈরি করুন:

```bash
# আপনার External Supabase Credentials
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**⚠️ Important**: 
- `your-project-id.supabase.co` এর জায়গায় আপনার actual Supabase project URL দিন
- `your-anon-key-here` এর জায়গায় আপনার actual anon/public key দিন

### Credentials কোথায় পাবেন:

1. [Supabase Dashboard](https://app.supabase.com) এ যান
2. আপনার project select করুন
3. **Settings** → **API** এ যান
4. **Project URL** এবং **anon/public key** copy করুন

---

## 🔍 Step 2: Code Verification

### Supabase Client Configuration

আপনার code already external Supabase use করছে। Verify করুন:

**File**: `src/integrations/supabase/client.ts`

```typescript
// ✅ এটি correct - environment variables থেকে values নিচ্ছে
const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_PUBLISHABLE_KEY = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY;

export const supabase = createClient<Database>(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
  auth: {
    storage: localStorage,
    persistSession: true,
    autoRefreshToken: true,
  }
});
```

**✅ এটি correct!** Code directly আপনার `.env` file থেকে values নিচ্ছে, Lovable cloud থেকে নয়।

---

## 🔍 Step 3: Lovable References Check

### Development Tool (Safe to Keep)

`vite.config.ts` এ `lovable-tagger` আছে, কিন্তু এটি:
- ✅ **শুধু development tool** - component tagging এর জন্য
- ✅ **Lovable cloud এ connect করে না**
- ✅ **Database operations এর সাথে সম্পর্ক নেই**

আপনি চাইলে এটি remove করতে পারেন, কিন্তু এটি কোনো সমস্যা করবে না।

### Documentation References

README এবং documentation এ Lovable এর mention আছে, কিন্তু:
- ✅ **শুধু documentation** - actual code এ নয়
- ✅ **Database operations এর সাথে সম্পর্ক নেই**

---

## 🔍 Step 4: Database Connection Test

### Test 1: Environment Variables Load হচ্ছে কিনা

Browser console এ check করুন:

```javascript
// Browser console এ run করুন
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Set' : 'Not Set');
```

**Expected**: 
- URL: `https://your-project-id.supabase.co`
- Key: `Set`

### Test 2: Database Connection

Browser console এ:

```javascript
import { supabase } from '@/integrations/supabase/client';

// Test connection
const { data, error } = await supabase.from('profiles').select('count').limit(1);
console.log('Connection:', error ? 'Failed' : 'Success');
console.log('Error:', error);
```

**Expected**: `Connection: Success`

---

## 🔍 Step 5: Verify Database Operations

### All Database Operations External Supabase Use করছে

আপনার codebase এ সব database operations Supabase client দিয়ে হচ্ছে:

```typescript
// ✅ সব operations এই client দিয়ে হচ্ছে
import { supabase } from '@/integrations/supabase/client';

// Examples:
await supabase.from('profiles').select('*');
await supabase.auth.signInWithPassword({ email, password });
await supabase.storage.from('avatars').upload(...);
```

**✅ সব operations আপনার external Supabase database এ যাচ্ছে!**

---

## 🚨 Common Issues & Solutions

### Issue 1: "Supabase URL is undefined"

**Solution**:
1. `.env` file root directory এ আছে কিনা check করুন
2. File name exactly `.env` হতে হবে (`.env.local` নয়)
3. Development server restart করুন:
   ```bash
   npm run dev
   ```

### Issue 2: "Invalid API key"

**Solution**:
1. Supabase Dashboard → Settings → API
2. **anon/public key** copy করুন (service role key নয়!)
3. `.env` file এ update করুন
4. Server restart করুন

### Issue 3: "Connection refused"

**Solution**:
1. Supabase project active আছে কিনা check করুন
2. Project URL correct কিনা verify করুন
3. Internet connection check করুন

---

## ✅ Verification Checklist

- [ ] `.env` file তৈরি করা হয়েছে
- [ ] `VITE_SUPABASE_URL` correct Supabase URL আছে
- [ ] `VITE_SUPABASE_PUBLISHABLE_KEY` correct anon key আছে
- [ ] Development server restart করা হয়েছে
- [ ] Browser console এ environment variables load হচ্ছে
- [ ] Database connection test successful
- [ ] Application login/signup কাজ করছে
- [ ] Database operations (CRUD) কাজ করছে

---

## 🎯 Final Verification

### Test Complete Flow:

1. **Start Server**:
   ```bash
   npm run dev
   ```

2. **Open Browser**: `http://localhost:8080`

3. **Test Authentication**:
   - Sign up করুন
   - Sign in করুন
   - Profile check করুন

4. **Check Database**:
   - Supabase Dashboard → Table Editor
   - `profiles` table এ আপনার user দেখতে পাবেন
   - `auth.users` table এ user দেখতে পাবেন

**✅ যদি সব কাজ করে, তাহলে আপনার project সম্পূর্ণভাবে external Supabase use করছে!**

---

## 📝 Important Notes

### Lovable Tagger (Optional)

`lovable-tagger` শুধু development tool, database এর সাথে সম্পর্ক নেই। Remove করতে চাইলে:

1. `package.json` থেকে remove করুন:
   ```json
   "lovable-tagger": "^1.1.11"
   ```

2. `vite.config.ts` থেকে remove করুন:
   ```typescript
   // Remove this line:
   import { componentTagger } from "lovable-tagger";
   
   // Update plugins:
   plugins: [react()].filter(Boolean),
   ```

3. Reinstall:
   ```bash
   npm install
   ```

**Note**: এটি optional - রাখলেও কোনো সমস্যা নেই।

---

## 🆘 Still Having Issues?

1. **Check `.env` file**: Root directory এ আছে কিনা
2. **Check Supabase Project**: Active আছে কিনা
3. **Check Network**: Browser console এ errors দেখুন
4. **Check Migrations**: Database migrations apply করা হয়েছে কিনা

---

**আপনার project এখন সম্পূর্ণভাবে external Supabase database use করছে!** 🎉
