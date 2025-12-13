# 🎯 External Supabase Setup - Complete Guide

আপনার project **ইতিমধ্যে external Supabase database use করছে**! এই guide আপনাকে setup এবং verify করতে সাহায্য করবে।

---

## ✅ Current Status

### আপনার Code Already Ready! 🎉

আপনার codebase এ:
- ✅ Supabase client properly configured
- ✅ Environment variables থেকে credentials নিচ্ছে
- ✅ কোনো hardcoded Lovable URLs নেই
- ✅ সব database operations Supabase client দিয়ে হচ্ছে

**আপনাকে শুধু `.env` file এ আপনার Supabase credentials add করতে হবে!**

---

## 🚀 Setup Steps

### Step 1: Supabase Project তৈরি করুন (যদি না থাকে)

1. [Supabase Dashboard](https://app.supabase.com) এ যান
2. **New Project** click করুন
3. Project details fill করুন:
   - Project name
   - Database password
   - Region (nearest select করুন)
4. **Create new project** click করুন

### Step 2: Credentials সংগ্রহ করুন

1. Project create হওয়ার পর, **Settings** → **API** এ যান
2. এই দুটি value copy করুন:
   - **Project URL**: `https://xxxxx.supabase.co`
   - **anon/public key**: `eyJhbGc...` (long string)

### Step 3: `.env` File তৈরি করুন

Project root directory (`EduLearn_new/`) এ `.env` file তৈরি করুন:

```bash
# External Supabase Configuration
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

**⚠️ Important**: 
- `your-project-id.supabase.co` এর জায়গায় আপনার actual URL দিন
- `your-anon-key-here` এর জায়গায় আপনার actual key দিন

### Step 4: Database Migrations Apply করুন

1. [Supabase Dashboard](https://app.supabase.com) → আপনার project
2. **SQL Editor** এ যান
3. `supabase/migrations/` folder থেকে সব migration files open করুন
4. প্রতিটি file এর content copy করে SQL Editor এ paste করুন
5. **Run** click করুন

**অথবা** Supabase CLI use করুন:
```bash
supabase link --project-ref your-project-ref
supabase db push
```

### Step 5: Verify Connection

1. Development server start করুন:
   ```bash
   npm run dev
   ```

2. Browser এ `http://localhost:8080` open করুন

3. **Test**:
   - Sign up করুন একটি account দিয়ে
   - Sign in করুন
   - Supabase Dashboard → Table Editor → `profiles` check করুন

**✅ যদি user create হয় এবং Supabase Dashboard এ দেখা যায়, তাহলে সব ঠিক!**

---

## 🔍 Verification

### Quick Check

Browser console এ (F12):

```javascript
// Check environment variables
console.log('URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Key:', import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ? 'Set ✅' : 'Not Set ❌');
```

**Expected**: 
- URL: আপনার Supabase project URL
- Key: `Set ✅`

### Detailed Verification

See: [`docs/supabase/VERIFY_EXTERNAL_SUPABASE.md`](./docs/supabase/VERIFY_EXTERNAL_SUPABASE.md)

---

## 📝 Important Notes

### Lovable Tagger (Development Tool)

`vite.config.ts` এ `lovable-tagger` আছে, কিন্তু এটি:
- ✅ **শুধু development tool** - component tagging এর জন্য
- ✅ **Database এর সাথে কোনো সম্পর্ক নেই**
- ✅ **Lovable cloud এ connect করে না**

আপনি চাইলে remove করতে পারেন, কিন্তু রাখলেও কোনো সমস্যা নেই।

### Documentation References

README এ Lovable এর mention আছে, কিন্তু:
- ✅ **শুধু documentation** - code এ নয়
- ✅ **Database operations এর সাথে সম্পর্ক নেই**

---

## 🚨 Common Issues

### Issue 1: Environment Variables Load হচ্ছে না

**Solution**:
1. `.env` file root directory এ আছে কিনা check করুন
2. File name exactly `.env` হতে হবে
3. Development server **restart** করুন:
   ```bash
   # Stop server (Ctrl+C)
   npm run dev
   ```

### Issue 2: "Invalid API key" Error

**Solution**:
1. Supabase Dashboard → Settings → API
2. **anon/public key** copy করুন (service role key নয়!)
3. `.env` file update করুন
4. Server restart করুন

### Issue 3: Database Tables নেই

**Solution**:
1. Migrations apply করা হয়েছে কিনা check করুন
2. Supabase Dashboard → SQL Editor
3. `supabase/migrations/` folder থেকে সব files run করুন

---

## ✅ Success Checklist

- [ ] Supabase project তৈরি করা হয়েছে
- [ ] `.env` file তৈরি করা হয়েছে
- [ ] Correct credentials add করা হয়েছে
- [ ] Database migrations apply করা হয়েছে
- [ ] Development server start করা হয়েছে
- [ ] Browser console এ environment variables load হচ্ছে
- [ ] Sign up/Sign in কাজ করছে
- [ ] Supabase Dashboard এ data দেখা যাচ্ছে

---

## 📚 Additional Resources

- **Quick Setup**: [`docs/setup/QUICK_SETUP.md`](./docs/setup/QUICK_SETUP.md)
- **Database Management**: [`docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md`](./docs/supabase/SUPABASE_DATABASE_MANAGEMENT.md)
- **User Management**: [`docs/supabase/SUPABASE_USER_MANAGEMENT.md`](./docs/supabase/SUPABASE_USER_MANAGEMENT.md)
- **Verification Guide**: [`docs/supabase/VERIFY_EXTERNAL_SUPABASE.md`](./docs/supabase/VERIFY_EXTERNAL_SUPABASE.md)

---

## 🎉 Summary

**আপনার project already external Supabase use করার জন্য ready!**

আপনাকে শুধু:
1. ✅ `.env` file এ credentials add করতে হবে
2. ✅ Migrations apply করতে হবে
3. ✅ Verify করতে হবে

**কোনো code change এর প্রয়োজন নেই!** 🚀

---

**Need Help?** See [`docs/supabase/VERIFY_EXTERNAL_SUPABASE.md`](./docs/supabase/VERIFY_EXTERNAL_SUPABASE.md) for detailed troubleshooting.
