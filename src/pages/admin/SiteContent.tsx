import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/lib/auth';
import { useToast } from '@/hooks/use-toast';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

type LandingCms = {
  badge: string;
  title_line_1: string;
  title_line_2: string;
  subtitle: string;
  cta_title: string;
  cta_subtitle: string;
};

const DEFAULTS: LandingCms = {
  badge: 'Modern E-Learning Platform',
  title_line_1: 'Learn Anything,',
  title_line_2: 'Anytime, Anywhere',
  subtitle:
    'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials. Your journey to knowledge starts here.',
  cta_title: 'Ready to Start Learning?',
  cta_subtitle: 'Join thousands of students already learning on our platform. Sign up now and get access to all courses.',
};

export default function SiteContent() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user, role, loading } = useAuth();

  const canEdit = useMemo(() => role === 'admin' || role === 'super_admin', [role]);

  const [form, setForm] = useState<LandingCms>(DEFAULTS);
  const [isSaving, setIsSaving] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) navigate('/auth');
    if (!loading && user && !canEdit) navigate('/dashboard');
  }, [loading, user, canEdit, navigate]);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setIsLoading(true);
      const { data, error } = await supabase
        .from('site_settings')
        .select('value')
        .eq('key', 'landing')
        .maybeSingle();

      if (!mounted) return;
      if (error) {
        toast({ title: 'Error', description: error.message, variant: 'destructive' });
        setIsLoading(false);
        return;
      }

      const value = (data as any)?.value;
      setForm({
        badge: value?.badge ?? DEFAULTS.badge,
        title_line_1: value?.title_line_1 ?? DEFAULTS.title_line_1,
        title_line_2: value?.title_line_2 ?? DEFAULTS.title_line_2,
        subtitle: value?.subtitle ?? DEFAULTS.subtitle,
        cta_title: value?.cta_title ?? DEFAULTS.cta_title,
        cta_subtitle: value?.cta_subtitle ?? DEFAULTS.cta_subtitle,
      });
      setIsLoading(false);
    })();

    return () => {
      mounted = false;
    };
  }, [toast]);

  const save = async () => {
    setIsSaving(true);
    const { error } = await supabase.from('site_settings').upsert(
      [
        {
          key: 'landing',
          value: form as any,
          updated_by: user?.id ?? null,
        },
      ],
      { onConflict: 'key' }
    );

    if (error) {
      toast({ title: 'Error', description: error.message, variant: 'destructive' });
      setIsSaving(false);
      return;
    }

    toast({ title: 'Saved', description: 'Landing page content updated.' });
    setIsSaving(false);
  };

  return (
    <div className="min-h-screen p-6 bg-gradient-to-br from-primary/5 via-background to-secondary/5">
      <div className="max-w-3xl mx-auto space-y-6">
        <Card className="border-2">
          <CardHeader>
            <CardTitle>Landing Page CMS</CardTitle>
            <CardDescription>Only Admin/Super Admin can edit. Changes appear on the landing page.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between gap-4">
              <Button variant="ghost" onClick={() => navigate('/dashboard/admin')}>
                Back to Admin Dashboard
              </Button>
              <Button onClick={() => navigate('/')}>View Landing</Button>
            </div>

            {isLoading ? (
              <div className="text-sm text-muted-foreground">Loading…</div>
            ) : (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Hero badge</Label>
                  <Input value={form.badge} onChange={(e) => setForm({ ...form, badge: e.target.value })} />
                </div>

                <div className="grid gap-4 md:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Title line 1</Label>
                    <Input value={form.title_line_1} onChange={(e) => setForm({ ...form, title_line_1: e.target.value })} />
                  </div>
                  <div className="space-y-2">
                    <Label>Title line 2</Label>
                    <Input value={form.title_line_2} onChange={(e) => setForm({ ...form, title_line_2: e.target.value })} />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Hero subtitle</Label>
                  <Textarea value={form.subtitle} onChange={(e) => setForm({ ...form, subtitle: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>CTA title</Label>
                  <Input value={form.cta_title} onChange={(e) => setForm({ ...form, cta_title: e.target.value })} />
                </div>

                <div className="space-y-2">
                  <Label>CTA subtitle</Label>
                  <Textarea value={form.cta_subtitle} onChange={(e) => setForm({ ...form, cta_subtitle: e.target.value })} />
                </div>

                <div className="flex justify-end gap-3">
                  <Button
                    variant="outline"
                    onClick={() => setForm(DEFAULTS)}
                    disabled={isSaving}
                  >
                    Reset
                  </Button>
                  <Button onClick={save} disabled={isSaving}>
                    {isSaving ? 'Saving…' : 'Save'}
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

