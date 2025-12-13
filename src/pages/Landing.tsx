import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Video, FileText, Users, Award, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

export default function Landing() {
  const { user } = useAuth();
  const [cms, setCms] = useState<{
    badge: string;
    title_line_1: string;
    title_line_2: string;
    subtitle: string;
    cta_title: string;
    cta_subtitle: string;
  } | null>(null);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('site_settings')
          .select('value')
          .eq('key', 'landing')
          .maybeSingle();

        if (!isMounted) return;

        if (error) {
          console.warn('Failed to load landing CMS settings:', error.message);
          return;
        }

        const value = (data as any)?.value;
        if (value && typeof value === 'object') {
          setCms({
            badge: value.badge ?? 'Modern E-Learning Platform',
            title_line_1: value.title_line_1 ?? 'Learn Anything,',
            title_line_2: value.title_line_2 ?? 'Anytime, Anywhere',
            subtitle:
              value.subtitle ??
              'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials. Your journey to knowledge starts here.',
            cta_title: value.cta_title ?? 'Ready to Start Learning?',
            cta_subtitle:
              value.cta_subtitle ??
              'Join thousands of students already learning on our platform. Sign up now and get access to all courses.',
          });
        }
      } catch (error: any) {
        if (isMounted) {
          console.warn('Error loading landing CMS settings:', error.message);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="relative py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
        
        <div className="container mx-auto relative z-10">
          <div className="max-w-4xl mx-auto text-center space-y-8">
            <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary border border-primary/20">
              <Zap className="h-4 w-4" />
              {cms?.badge ?? 'Modern E-Learning Platform'}
            </div>
            
            <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
              {cms?.title_line_1 ?? 'Learn Anything,'}
              <span className="text-primary block mt-2">{cms?.title_line_2 ?? 'Anytime, Anywhere'}</span>
            </h1>
            
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              {cms?.subtitle ??
                'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials. Your journey to knowledge starts here.'}
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              {user ? (
                <>
                  <Link to="/courses">
                    <Button size="lg" className="w-full sm:w-auto">
                      Browse Courses
                      <BookOpen className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/dashboard">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Go to Dashboard
                    </Button>
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/auth">
                    <Button size="lg" className="w-full sm:w-auto">
                      Get Started Free
                      <GraduationCap className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <Link to="/courses">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto">
                      Explore Courses
                    </Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20 px-4 bg-card/50">
        <div className="container mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Why Choose EduLearn?</h2>
            <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
              We provide everything you need for an exceptional learning experience
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Video className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Video Lessons</CardTitle>
                <CardDescription>
                  Watch high-quality video tutorials from expert instructors at your own pace
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Study Materials</CardTitle>
                <CardDescription>
                  Download comprehensive PDF resources and notes for offline study
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Users className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Expert Teachers</CardTitle>
                <CardDescription>
                  Learn from experienced educators and industry professionals
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <BookOpen className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Rich Course Library</CardTitle>
                <CardDescription>
                  Access a growing collection of courses across multiple subjects
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Award className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Track Progress</CardTitle>
                <CardDescription>
                  Monitor your learning journey and celebrate your achievements
                </CardDescription>
              </CardHeader>
            </Card>

            <Card className="border-2 hover:border-primary transition-colors">
              <CardHeader>
                <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                  <Zap className="h-6 w-6 text-primary" />
                </div>
                <CardTitle>Easy to Use</CardTitle>
                <CardDescription>
                  Simple, intuitive interface designed for seamless learning
                </CardDescription>
              </CardHeader>
            </Card>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      {!user && (
        <section className="py-20 px-4">
          <div className="container mx-auto">
            <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-secondary/5 max-w-4xl mx-auto">
              <CardContent className="p-12 text-center">
                <GraduationCap className="h-16 w-16 text-primary mx-auto mb-6" />
                <h2 className="text-3xl md:text-4xl font-bold mb-4">
                  {cms?.cta_title ?? 'Ready to Start Learning?'}
                </h2>
                <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                  {cms?.cta_subtitle ??
                    'Join thousands of students already learning on our platform. Sign up now and get access to all courses.'}
                </p>
                <Link to="/auth">
                  <Button size="lg">
                    Create Your Account
                    <GraduationCap className="ml-2 h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </section>
      )}
    </div>
  );
}
