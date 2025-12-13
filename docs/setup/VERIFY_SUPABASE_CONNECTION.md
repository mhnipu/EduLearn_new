# 🔍 Quick Supabase Connection Verification

এই file দিয়ে quickly verify করুন যে আপনার project external Supabase use করছে।

## ✅ Quick Check

### 1. Environment Variables Check

`.env` file এ এই variables আছে কিনা check করুন:

```bash
VITE_SUPABASE_URL=https://your-project-id.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-key-here
```

### 2. Browser Console Check

1. `npm run dev` run করুন
2. Browser এ `http://localhost:8080` open করুন
3. Browser Console open করুন (F12)
4. এই command run করুন:

```javascript
// Check environment variables
console.log('Supabase URL:', import.meta.env.VITE_SUPABASE_URL);
console.log('Supabase Key Set:', !!import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY);
```

**Expected Output**:
- `Supabase URL: https://your-project-id.supabase.co`
- `Supabase Key Set: true`

### 3. Database Connection Test

Browser console এ:

```javascript
// Import supabase client
const { supabase } = await import('/src/integrations/supabase/client.ts');

// Test connection
const { data, error } = await supabase.from('profiles').select('count').limit(1);
if (error) {
  console.error('❌ Connection Failed:', error.message);
} else {
  console.log('✅ Connection Successful!');
}
```

### 4. Verify in Supabase Dashboard

1. [Supabase Dashboard](https://app.supabase.com) এ যান
2. আপনার project select করুন
3. **Table Editor** → **profiles** table check করুন
4. **Authentication** → **Users** check করুন

---

## 🎯 Success Indicators

✅ **সব ঠিক আছে যদি:**
- Environment variables load হচ্ছে
- Database connection successful
- Login/Signup কাজ করছে
- Supabase Dashboard এ data দেখা যাচ্ছে

❌ **সমস্যা আছে যদি:**
- Environment variables undefined
- Connection errors
- "Invalid API key" error
- Database operations fail

---

## 🆘 Troubleshooting

### Problem: Environment variables undefined

**Solution**:
1. `.env` file root directory এ আছে কিনা check করুন
2. File name exactly `.env` হতে হবে
3. Development server restart করুন: `npm run dev`

### Problem: Invalid API key

**Solution**:
1. Supabase Dashboard → Settings → API
2. **anon/public key** copy করুন (service role key নয়!)
3. `.env` file update করুন
4. Server restart করুন

---

**Full Verification Guide**: [`docs/supabase/VERIFY_EXTERNAL_SUPABASE.md`](./docs/supabase/VERIFY_EXTERNAL_SUPABASE.md)
