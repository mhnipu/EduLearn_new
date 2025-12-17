import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { GraduationCap, Mail, Phone, Eye, EyeOff, Lock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { z } from 'zod';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Progress } from '@/components/ui/progress';
import { supabase } from '@/integrations/supabase/client';

const DEFAULT_SUPER_ADMIN_EMAIL = 'super@gmail.com';

const getDashboardPath = (role: string | null) => {
  if (!role) return '/pending-approval';
  if (role === 'super_admin' || role === 'admin') return '/dashboard/admin';
  return `/dashboard/${role}`;
};

const loginEmailSchema = z.object({
  email: z.string().trim().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const loginPhoneSchema = z.object({
  phone: z.string().min(11, 'Phone number must be at least 11 digits'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

const signupSchema = z.object({
  fullName: z.string().trim().min(2, 'Name must be at least 2 characters').max(100),
  email: z.string().trim().toLowerCase().email('Invalid email address').max(255),
  phone: z.string().trim().min(11, 'Phone number must be at least 11 digits').optional().or(z.literal('')),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: "Passwords don't match",
  path: ['confirmPassword'],
});

// Password strength calculation
const calculatePasswordStrength = (password: string): { strength: number; label: string; color: string } => {
  if (!password) return { strength: 0, label: '', color: '' };
  
  let strength = 0;
  if (password.length >= 6) strength += 20;
  if (password.length >= 8) strength += 10;
  if (password.length >= 12) strength += 10;
  if (/[a-z]/.test(password)) strength += 15;
  if (/[A-Z]/.test(password)) strength += 15;
  if (/[0-9]/.test(password)) strength += 15;
  if (/[^a-zA-Z0-9]/.test(password)) strength += 15;
  
  let label = '';
  let color = '';
  if (strength < 40) {
    label = 'Weak';
    color = 'bg-red-500';
  } else if (strength < 70) {
    label = 'Fair';
    color = 'bg-yellow-500';
  } else if (strength < 90) {
    label = 'Good';
    color = 'bg-blue-500';
  } else {
    label = 'Strong';
    color = 'bg-green-500';
  }
  
  return { strength, label, color };
};

export default function AuthEnhanced() {
  const [isLoading, setIsLoading] = useState(false);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [password, setPassword] = useState('');
  const [forgotPasswordEmail, setForgotPasswordEmail] = useState('');
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [isSendingReset, setIsSendingReset] = useState(false);
  const { signIn, signInWithPhone, signUp, user, role, loading } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const passwordStrength = calculatePasswordStrength(password);


  // Redirect if already logged in
  useEffect(() => {
    if (!loading && user) {
      navigate(getDashboardPath(role), { replace: true });
    }
  }, [user, role, loading, navigate]);

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const password = formData.get('password') as string;

    try {
      if (loginMethod === 'email') {
        const email = (formData.get('email') as string).trim().toLowerCase();
        console.log('📧 Email entered:', email);
        console.log('🔍 Validating email format...');
        
        loginEmailSchema.parse({ email, password });
        console.log('✅ Email validation passed');
        
        console.log('🔐 Attempting email login to external Supabase...');
        const { error } = await signIn(email, password);
        
        if (error) {
          if (error.message?.toLowerCase?.().includes('email not confirmed')) {
            toast({
              variant: 'destructive',
              title: 'Email not confirmed',
              description: 'Disable email confirmation in Supabase Auth settings OR confirm this email in Dashboard → Authentication → Users.',
            });
            return;
          }
          // Check for specific error types
          const errorMsg = error.message.toLowerCase();
          
          if (errorMsg.includes('invalid login credentials') || errorMsg.includes('invalid email or password')) {
            // Check if this might be an email confirmation issue
            toast({
              variant: 'destructive',
              title: 'Login Failed',
              description: 'Invalid email or password. If you just signed up, your email may need confirmation. Check your email or disable email confirmation in Supabase Dashboard.',
            });
          } else if (errorMsg.includes('email not confirmed') || errorMsg.includes('not confirmed')) {
            toast({
              variant: 'destructive',
              title: 'Email Not Confirmed',
              description: 'Please check your email and click the confirmation link, or disable email confirmation in Supabase Dashboard → Authentication → Providers.',
            });
          } else {
            toast({
              variant: 'destructive',
              title: 'Error',
              description: error.message,
            });
          }
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in to your external Supabase account.',
          });
        }
      } else {
        const phone = formData.get('phone') as string;
        loginPhoneSchema.parse({ phone, password });
        
        console.log('🔐 Attempting phone login to external Supabase...');
        const { error } = await signInWithPhone(phone, password);
        
        if (error) {
          toast({
            variant: 'destructive',
            title: 'Login Failed',
            description: error.message,
          });
        } else {
          toast({
            title: 'Welcome back!',
            description: 'You have successfully logged in with phone.',
          });
        }
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: error.errors[0].message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignup = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsLoading(true);

    const formData = new FormData(e.currentTarget);
    const fullName = formData.get('fullName') as string;
    const email = formData.get('email') as string;
    const phone = formData.get('phone') as string;
    const password = formData.get('password') as string;
    const confirmPassword = formData.get('confirmPassword') as string;

    try {
      const trimmedFullName = fullName.trim();
      const trimmedEmail = email.trim().toLowerCase();
      const trimmedPhone = phone.trim();
      
      console.log('📧 Signup Email:', trimmedEmail);
      console.log('📱 Signup Phone:', trimmedPhone);
      console.log('🔍 Validating signup data...');
      
      signupSchema.parse({ 
        fullName: trimmedFullName, 
        email: trimmedEmail, 
        phone: trimmedPhone, 
        password, 
        confirmPassword 
      });
      console.log('✅ Validation passed');
      
      console.log('📝 Creating new account in external Supabase...');
      console.log('📊 User data will be saved to:', import.meta.env.VITE_SUPABASE_URL);
      console.log('📧 Final email being sent to Supabase:', trimmedEmail);
      console.log('📧 Email length:', trimmedEmail.length);
      console.log('📧 Email charCodes:', Array.from(trimmedEmail).map(c => c.charCodeAt(0)));
      
      // Signup without role - role will be assigned by SuperAdmin
      const { error } = await signUp(trimmedEmail, password, trimmedFullName, trimmedPhone);
      
      if (error) {
        console.error('❌ Signup error from Supabase:', error);
        console.error('❌ Error message:', error.message);
        console.error('❌ Error name:', error.name);
        console.error('❌ Full error object:', JSON.stringify(error, null, 2));
        
        if (error.message.includes('already registered')) {
          toast({
            variant: 'destructive',
            title: 'Signup Failed',
            description: 'An account with this email already exists in the external Supabase database.',
          });
        } else {
          toast({
            variant: 'destructive',
            title: 'Error',
            description: error.message,
          });
        }
      } else {
        // Auto-login after signup so user goes directly to dashboard (requires: email confirmations OFF)
        const { error: loginError } = await signIn(trimmedEmail, password);

        if (loginError) {
          if (loginError.message?.toLowerCase?.().includes('email not confirmed')) {
            toast({
              variant: 'destructive',
              title: 'Email confirmation is enabled',
              description:
                'To go directly to dashboard after signup, disable: Dashboard → Authentication → Providers/Settings → "Confirm email".',
            });
            return;
          }

          toast({
            variant: 'destructive',
            title: 'Signup succeeded, but auto-login failed',
            description: loginError.message,
          });
          return;
        }

        toast({
          title: 'Account Created!',
          description:
            trimmedEmail === DEFAULT_SUPER_ADMIN_EMAIL
              ? 'Super admin bootstrap will run on login. Redirecting...'
              : 'Signup successful. Redirecting to your dashboard...',
        });

        // Let auth context load roles, then redirect
        navigate('/dashboard', { replace: true });
      }
    } catch (error) {
      if (error instanceof z.ZodError) {
        toast({
          variant: 'destructive',
          title: 'Validation Error',
          description: error.errors[0].message,
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setIsSendingReset(true);
    
    try {
      const email = forgotPasswordEmail.trim().toLowerCase();
      if (!email) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: 'Please enter your email address',
        });
        return;
      }
      
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth?reset=true`,
      });
      
      if (error) {
        toast({
          variant: 'destructive',
          title: 'Error',
          description: error.message,
        });
      } else {
        toast({
          title: 'Password reset email sent',
          description: 'Check your email for password reset instructions.',
        });
        setShowForgotPassword(false);
        setForgotPasswordEmail('');
      }
    } catch (error: any) {
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error.message || 'Failed to send reset email',
      });
    } finally {
      setIsSendingReset(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10">
      <Card className="w-full max-w-md border-2">
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center">
              <GraduationCap className="h-10 w-10 text-primary" />
            </div>
          </div>
          <CardTitle className="text-2xl">Welcome to EduLearn</CardTitle>
          <CardDescription>
            Sign in to your account or create a new one
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs 
            defaultValue="login" 
            className="w-full"
            onValueChange={() => {
              setPassword('');
              setShowForgotPassword(false);
              setForgotPasswordEmail('');
            }}
          >
            <TabsList 
              className="grid w-full grid-cols-2"
              style={{ backgroundColor: 'rgba(248, 234, 226, 1)' }}
            >
              <TabsTrigger value="login">Login</TabsTrigger>
              <TabsTrigger value="signup">Sign Up</TabsTrigger>
            </TabsList>
            
            <TabsContent value="login">
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Login Method</Label>
                  <RadioGroup value={loginMethod} onValueChange={(value: 'email' | 'phone') => setLoginMethod(value)} className="flex gap-4">
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="email" id="email" />
                      <Label htmlFor="email" className="flex items-center gap-2 cursor-pointer">
                        <Mail className="h-4 w-4" />
                        Email
                      </Label>
                    </div>
                    <div className="flex items-center space-x-2">
                      <RadioGroupItem value="phone" id="phone" />
                      <Label htmlFor="phone" className="flex items-center gap-2 cursor-pointer">
                        <Phone className="h-4 w-4" />
                        Phone
                      </Label>
                    </div>
                  </RadioGroup>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                  {loginMethod === 'email' ? (
                    <div className="space-y-2">
                      <Label htmlFor="login-email">Email</Label>
                      <Input
                        id="login-email"
                        name="email"
                        type="email"
                        placeholder="you@example.com"
                        required
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <Label htmlFor="login-phone">Phone Number</Label>
                      <Input
                        id="login-phone"
                        name="phone"
                        type="tel"
                        placeholder="+8801XXXXXXXXX"
                        required
                      />
                    </div>
                  )}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <Label htmlFor="login-password">Password</Label>
                      <button
                        type="button"
                        onClick={() => setShowForgotPassword(!showForgotPassword)}
                        className="text-sm text-primary hover:underline"
                      >
                        Forgot password?
                      </button>
                    </div>
                    <div className="relative">
                      <Input
                        id="login-password"
                        name="password"
                        type={showLoginPassword ? 'text' : 'password'}
                        placeholder="password"
                        required
                        className="pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowLoginPassword(!showLoginPassword)}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showLoginPassword ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {showForgotPassword && (
                    <div className="p-4 border rounded-lg bg-muted/50 space-y-3">
                      <div className="flex items-center gap-2">
                        <Lock className="h-4 w-4 text-primary" />
                        <Label className="text-sm font-medium">Reset Password</Label>
                      </div>
                      <form onSubmit={handleForgotPassword} className="space-y-2">
                        <Input
                          type="email"
                          placeholder="Enter your email"
                          value={forgotPasswordEmail}
                          onChange={(e) => setForgotPasswordEmail(e.target.value)}
                          required
                        />
                        <div className="flex gap-2">
                          <Button
                            type="submit"
                            size="sm"
                            className="flex-1"
                            disabled={isSendingReset}
                          >
                            {isSendingReset ? 'Sending...' : 'Send Reset Link'}
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setShowForgotPassword(false);
                              setForgotPasswordEmail('');
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </form>
                    </div>
                  )}
                  
                  <Button type="submit" className="w-full" disabled={isLoading}>
                    {isLoading ? 'Signing in...' : 'Sign In'}
                  </Button>
                </form>
              </div>
            </TabsContent>
            
            <TabsContent value="signup">
              <form onSubmit={handleSignup} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="signup-name">Full Name</Label>
                  <Input
                    id="signup-name"
                    name="fullName"
                    type="text"
                    placeholder="Name"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-email">Email</Label>
                  <Input
                    id="signup-email"
                    name="email"
                    type="email"
                    placeholder="you@example.com"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-phone">Phone Number (Optional)</Label>
                  <Input
                    id="signup-phone"
                    name="phone"
                    type="tel"
                    placeholder="+8801XXXXXXXXX"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-password">Password</Label>
                  <p className="text-xs text-muted-foreground">Password must be 6 digit</p>
                  <div className="relative">
                    <Input
                      id="signup-password"
                      name="password"
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  {password && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-muted-foreground">Password strength</span>
                        <span className={`font-medium ${
                          passwordStrength.strength < 40 ? 'text-red-500' :
                          passwordStrength.strength < 70 ? 'text-yellow-500' :
                          passwordStrength.strength < 90 ? 'text-blue-500' : 'text-green-500'
                        }`}>
                          {passwordStrength.label}
                        </span>
                      </div>
                      <Progress value={passwordStrength.strength} className="h-2" />
                      <div className="text-xs text-muted-foreground space-y-1">
                        <div className={`flex items-center gap-1 ${password.length >= 8 ? 'text-green-600' : ''}`}>
                          {password.length >= 8 ? '✓' : '○'} At least 8 characters
                        </div>
                        <div className={`flex items-center gap-1 ${/[a-z]/.test(password) && /[A-Z]/.test(password) ? 'text-green-600' : ''}`}>
                          {/[a-z]/.test(password) && /[A-Z]/.test(password) ? '✓' : '○'} Upper and lowercase letters
                        </div>
                        <div className={`flex items-center gap-1 ${/[0-9]/.test(password) ? 'text-green-600' : ''}`}>
                          {/[0-9]/.test(password) ? '✓' : '○'} At least one number
                        </div>
                        <div className={`flex items-center gap-1 ${/[^a-zA-Z0-9]/.test(password) ? 'text-green-600' : ''}`}>
                          {/[^a-zA-Z0-9]/.test(password) ? '✓' : '○'} At least one special character
                        </div>
                      </div>
                    </div>
                  )}
                </div>
                <div className="space-y-2">
                  <Label htmlFor="signup-confirm">Confirm Password</Label>
                  <div className="relative">
                    <Input
                      id="signup-confirm"
                      name="confirmPassword"
                      type={showConfirmPassword ? 'text' : 'password'}
                      placeholder="confirm password"
                      required
                      className="pr-10"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </div>
                <Button type="submit" className="w-full" disabled={isLoading}>
                  {isLoading ? 'Creating account...' : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
}
