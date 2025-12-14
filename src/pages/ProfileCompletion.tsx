import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, User, Mail, Phone, MapPin, AlertCircle, CheckCircle } from 'lucide-react';
import { Alert, AlertDescription } from '@/components/ui/alert';

export default function ProfileCompletion() {
  const { user, role } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileData, setProfileData] = useState({
    fullName: '',
    email: '',
    phone: '',
    address: '',
  });
  const [guardianData, setGuardianData] = useState({
    name: '',
    email: '',
    phone: '',
    address: '',
    relationship: '',
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (!user) {
      navigate('/auth');
      return;
    }

    // CRITICAL: Verify user actually has student role from backend
    const verifyStudentRole = async () => {
      const { data: userRoles, error } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);

      if (error) {
        console.error('Error verifying role:', error);
        navigate('/dashboard');
        return;
      }

      const roles = (userRoles || []).map(r => r.role);
      const hasStudentRole = roles.includes('student');
      const hasNonStudentRole = roles.some(r => ['guardian', 'teacher', 'admin', 'super_admin'].includes(r));

      // If user has guardian/teacher/admin role, redirect to their dashboard
      if (hasNonStudentRole) {
        navigate('/dashboard');
        return;
      }

      // Only proceed if user has ONLY student role
      if (!hasStudentRole) {
        navigate('/dashboard');
        return;
      }

      fetchProfileData();
    };

    verifyStudentRole();
  }, [user, role, navigate]);

  const fetchProfileData = async () => {
    try {
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user?.id)
        .single();

      if (error) throw error;

      if (profile) {
        setProfileData({
          fullName: profile.full_name || '',
          email: profile.email || user?.email || '',
          phone: profile.phone || '',
          address: profile.address || '',
        });

        setGuardianData({
          name: profile.guardian_name || '',
          email: profile.guardian_email || '',
          phone: profile.guardian_phone || '',
          address: profile.guardian_address || '',
          relationship: '',
        });

        // Check if guardian relationship exists
        const { data: guardianRelation } = await supabase
          .from('student_guardians')
          .select('relationship, profiles!student_guardians_guardian_id_fkey(*)')
          .eq('student_id', user?.id)
          .limit(1)
          .single();

        if (guardianRelation) {
          setGuardianData(prev => ({
            ...prev,
            relationship: guardianRelation.relationship || '',
            name: guardianRelation.profiles?.full_name || prev.name,
            email: guardianRelation.profiles?.email || prev.email,
            phone: guardianRelation.profiles?.phone || prev.phone,
            address: guardianRelation.profiles?.address || prev.address,
          }));
        }
      }
    } catch (error: any) {
      console.error('Error fetching profile:', error);
      toast({
        title: 'Error loading profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const validateForm = () => {
    const newErrors: Record<string, string> = {};

    if (!profileData.fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!guardianData.name.trim()) {
      newErrors.guardianName = 'Guardian name is required';
    }

    if (!guardianData.email.trim()) {
      newErrors.guardianEmail = 'Guardian email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(guardianData.email)) {
      newErrors.guardianEmail = 'Invalid email format';
    }

    if (!guardianData.phone.trim()) {
      newErrors.guardianPhone = 'Guardian phone is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) {
      toast({
        title: 'Please fix the errors',
        description: 'Some required fields are missing or invalid',
        variant: 'destructive',
      });
      return;
    }

    setSaving(true);
    try {
      // Update student profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: profileData.fullName,
          email: profileData.email || user?.email,
          phone: profileData.phone || null,
          address: profileData.address || null,
          guardian_name: guardianData.name,
          guardian_email: guardianData.email,
          guardian_phone: guardianData.phone,
          guardian_address: guardianData.address || null,
        })
        .eq('id', user?.id);

      if (profileError) throw profileError;

      // Try to link/create guardian user
      if (guardianData.email) {
        const { data: guardianUser } = await supabase
          .from('profiles')
          .select('id')
          .eq('email', guardianData.email)
          .single();

        if (guardianUser) {
          // Guardian user exists, create relationship
          await supabase
            .from('user_roles')
            .upsert({
              user_id: guardianUser.id,
              role: 'guardian',
            }, {
              onConflict: 'user_id,role',
            });

          await supabase
            .from('student_guardians')
            .upsert({
              student_id: user?.id,
              guardian_id: guardianUser.id,
              relationship: guardianData.relationship || null,
            }, {
              onConflict: 'student_id,guardian_id',
            });
        }
      }

      // Update profile completion status
      await supabase.rpc('update_profile_completion', {
        _user_id: user?.id,
      });

      toast({
        title: 'Profile completed!',
        description: 'Your profile and guardian information have been saved.',
      });

      // Redirect to dashboard
      navigate('/dashboard');
    } catch (error: any) {
      console.error('Error saving profile:', error);
      toast({
        title: 'Error saving profile',
        description: error.message,
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
          <p className="text-muted-foreground">Loading profile...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-primary/5 flex items-center justify-center p-4">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary/10">
              <AlertCircle className="h-6 w-6 text-primary" />
            </div>
            <div>
              <CardTitle className="text-2xl">Complete Your Profile</CardTitle>
              <CardDescription>
                Please complete your profile and guardian information to continue
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Alert className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              You must complete your profile and provide guardian information before accessing other features.
            </AlertDescription>
          </Alert>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Student Profile Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Your Information
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="fullName">
                    Full Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="fullName"
                    value={profileData.fullName}
                    onChange={(e) => {
                      setProfileData({ ...profileData, fullName: e.target.value });
                      setErrors({ ...errors, fullName: '' });
                    }}
                    placeholder="Your full name"
                    className={errors.fullName ? 'border-destructive' : ''}
                  />
                  {errors.fullName && (
                    <p className="text-sm text-destructive">{errors.fullName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Email
                  </Label>
                  <Input
                    id="email"
                    type="email"
                    value={profileData.email}
                    onChange={(e) => setProfileData({ ...profileData, email: e.target.value })}
                    placeholder="your@email.com"
                    disabled
                    className="bg-muted"
                  />
                  <p className="text-xs text-muted-foreground">Email cannot be changed</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="phone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Phone Number
                  </Label>
                  <Input
                    id="phone"
                    type="tel"
                    value={profileData.phone}
                    onChange={(e) => setProfileData({ ...profileData, phone: e.target.value })}
                    placeholder="+1234567890"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="address">
                    <MapPin className="h-4 w-4 inline mr-1" />
                    Address
                  </Label>
                  <Input
                    id="address"
                    value={profileData.address}
                    onChange={(e) => setProfileData({ ...profileData, address: e.target.value })}
                    placeholder="Your address"
                  />
                </div>
              </div>
            </div>

            {/* Guardian Information Section */}
            <div className="space-y-4 pt-6 border-t">
              <h3 className="text-lg font-semibold flex items-center gap-2">
                <User className="h-5 w-5 text-primary" />
                Guardian Information
              </h3>
              <p className="text-sm text-muted-foreground">
                Please provide contact information for your guardian or parent.
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianName">
                    Guardian Name <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guardianName"
                    value={guardianData.name}
                    onChange={(e) => {
                      setGuardianData({ ...guardianData, name: e.target.value });
                      setErrors({ ...errors, guardianName: '' });
                    }}
                    placeholder="Guardian full name"
                    className={errors.guardianName ? 'border-destructive' : ''}
                  />
                  {errors.guardianName && (
                    <p className="text-sm text-destructive">{errors.guardianName}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardianEmail">
                    <Mail className="h-4 w-4 inline mr-1" />
                    Guardian Email <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guardianEmail"
                    type="email"
                    value={guardianData.email}
                    onChange={(e) => {
                      setGuardianData({ ...guardianData, email: e.target.value });
                      setErrors({ ...errors, guardianEmail: '' });
                    }}
                    placeholder="guardian@example.com"
                    className={errors.guardianEmail ? 'border-destructive' : ''}
                  />
                  {errors.guardianEmail && (
                    <p className="text-sm text-destructive">{errors.guardianEmail}</p>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="guardianPhone">
                    <Phone className="h-4 w-4 inline mr-1" />
                    Guardian Phone <span className="text-destructive">*</span>
                  </Label>
                  <Input
                    id="guardianPhone"
                    type="tel"
                    value={guardianData.phone}
                    onChange={(e) => {
                      setGuardianData({ ...guardianData, phone: e.target.value });
                      setErrors({ ...errors, guardianPhone: '' });
                    }}
                    placeholder="+1234567890"
                    className={errors.guardianPhone ? 'border-destructive' : ''}
                  />
                  {errors.guardianPhone && (
                    <p className="text-sm text-destructive">{errors.guardianPhone}</p>
                  )}
                </div>

                <div className="space-y-2">
                  <Label htmlFor="guardianRelationship">Relationship</Label>
                  <Select
                    value={guardianData.relationship}
                    onValueChange={(value) => setGuardianData({ ...guardianData, relationship: value })}
                  >
                    <SelectTrigger id="guardianRelationship">
                      <SelectValue placeholder="Select relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="parent">Parent</SelectItem>
                      <SelectItem value="guardian">Guardian</SelectItem>
                      <SelectItem value="relative">Relative</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="guardianAddress">
                  <MapPin className="h-4 w-4 inline mr-1" />
                  Guardian Address
                </Label>
                <Input
                  id="guardianAddress"
                  value={guardianData.address}
                  onChange={(e) => setGuardianData({ ...guardianData, address: e.target.value })}
                  placeholder="Street address, City, State, ZIP"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-4">
              <Button
                type="submit"
                disabled={saving}
                className="min-w-[120px]"
              >
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="mr-2 h-4 w-4" />
                    Complete Profile
                  </>
                )}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}

