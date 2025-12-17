import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Video, FileText, Users, Award, Zap } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, any> = {
  GraduationCap,
  BookOpen,
  Video,
  FileText,
  Users,
  Award,
  Zap,
};

interface PageSection {
  id: string;
  section_type: string;
  title: string | null;
  content: any;
  order_index: number;
  is_active: boolean;
  image_url: string | null;
}

export default function Landing() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);

  // Protect landing page: Redirect authenticated users (guardians, teachers, students) away
  useEffect(() => {
    if (!authLoading && user && role) {
      // Only allow unauthenticated users or admins/super_admins to view landing page
      if (!['super_admin', 'admin'].includes(role)) {
        // Redirect to appropriate dashboard based on role
        if (role === 'guardian') {
          navigate('/dashboard/guardian', { replace: true });
        } else if (role === 'teacher') {
          navigate('/dashboard/teacher', { replace: true });
        } else if (role === 'student') {
          navigate('/dashboard/student', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
        return;
      }
    }
  }, [user, role, authLoading, navigate]);

  useEffect(() => {
    let isMounted = true;
    (async () => {
      try {
        const { data, error } = await supabase
          .from('page_sections')
          .select('*')
          .eq('page_type', 'landing')
          .eq('is_active', true)
          .order('order_index', { ascending: true });

        if (!isMounted) return;

        if (error) {
          console.warn('Failed to load landing page sections:', error.message);
          setSections([]);
          return;
        }

        setSections(data || []);
      } catch (error: any) {
        if (isMounted) {
          console.warn('Error loading landing page sections:', error.message);
          setSections([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    })();

    return () => {
      isMounted = false;
    };
  }, []);

  // Render section based on type
  const renderSection = (section: PageSection) => {
    const { section_type, content } = section;

    switch (section_type) {
      case 'hero':
        return (
          <section key={section.id} className="relative py-20 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
            <div className="container mx-auto relative z-10">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                {content?.badge && (
                  <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary border border-primary/20">
                    <Zap className="h-4 w-4" />
                    {content.badge}
                  </div>
                )}
                
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                  {content?.title_line_1 || 'Learn Anything,'}
                  {content?.title_line_2 && (
                    <span className="text-primary block mt-2">{content.title_line_2}</span>
                  )}
                </h1>
                
                {content?.subtitle && (
                  <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                    {content.subtitle}
                  </p>
                )}
                
                <div className="flex flex-col sm:flex-row gap-4 justify-center">
                  {user ? (
                    <>
                      {content?.cta_secondary && (
                        <Link to={content.cta_secondary.link || '/courses'}>
                          <Button size="lg" className="w-full sm:w-auto">
                            {content.cta_secondary.text || 'Browse Courses'}
                            <BookOpen className="ml-2 h-5 w-5" />
                          </Button>
                        </Link>
                      )}
                      <Link to="/dashboard">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto">
                          Go to Dashboard
                        </Button>
                      </Link>
                    </>
                  ) : (
                    <>
                      {content?.cta_primary && (
                        <Link to={content.cta_primary.link || '/auth'}>
                          <Button size="lg" className="w-full sm:w-auto">
                            {content.cta_primary.text || 'Get Started Free'}
                            <GraduationCap className="ml-2 h-5 w-5" />
                          </Button>
                        </Link>
                      )}
                      {content?.cta_secondary && (
                        <Link to={content.cta_secondary.link || '/courses'}>
                          <Button size="lg" variant="outline" className="w-full sm:w-auto">
                            {content.cta_secondary.text || 'Explore Courses'}
                          </Button>
                        </Link>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          </section>
        );

      case 'features':
        const features = content?.features || [];
        return (
          <section key={section.id} className="py-20 px-4 bg-card/50">
            <div className="container mx-auto">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && (
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>
                  )}
                  {content?.subtitle && (
                    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">
                      {content.subtitle}
                    </p>
                  )}
                </div>
              )}
              
              {features.length > 0 && (
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 max-w-6xl mx-auto">
                  {features.map((feature: any, index: number) => {
                    const IconComponent = iconMap[feature.icon] || BookOpen;
                    return (
                      <Card key={index} className="border-2 hover:border-primary transition-colors">
                        <CardHeader>
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          <CardTitle>{feature.title}</CardTitle>
                          <CardDescription>{feature.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );

      case 'cta':
        // Only show CTA section if user is not logged in (unless content specifies otherwise)
        if (user && !content?.show_when_logged_in) {
          return null;
        }
        return (
          <section key={section.id} className="py-20 px-4">
            <div className="container mx-auto">
              <Card className="border-2 border-primary bg-gradient-to-br from-primary/5 to-secondary/5 max-w-4xl mx-auto">
                <CardContent className="p-12 text-center">
                  <GraduationCap className="h-16 w-16 text-primary mx-auto mb-6" />
                  {content?.title && (
                    <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>
                  )}
                  {content?.subtitle && (
                    <p className="text-muted-foreground text-lg mb-8 max-w-2xl mx-auto">
                      {content.subtitle}
                    </p>
                  )}
                  {content?.cta_text && (
                    <Link to={content.cta_link || '/auth'}>
                      <Button size="lg">
                        {content.cta_text}
                        <GraduationCap className="ml-2 h-5 w-5" />
                      </Button>
                    </Link>
                  )}
                </CardContent>
              </Card>
            </div>
          </section>
        );

      case 'custom':
        // Render custom HTML content if provided
        if (content?.html) {
          return (
            <section key={section.id} className="py-20 px-4">
              <div className="container mx-auto">
                <div dangerouslySetInnerHTML={{ __html: content.html }} />
              </div>
            </section>
          );
        }
        return null;

      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {sections.length > 0 ? (
        sections.map(renderSection)
      ) : (
        // Fallback to default content if no sections found
        <>
          <section className="relative py-20 px-4 overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
            <div className="container mx-auto relative z-10">
              <div className="max-w-4xl mx-auto text-center space-y-8">
                <div className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary border border-primary/20">
                  <Zap className="h-4 w-4" />
                  Modern E-Learning Platform
                </div>
                <h1 className="text-5xl md:text-7xl font-bold tracking-tight">
                  Learn Anything,
                  <span className="text-primary block mt-2">Anytime, Anywhere</span>
                </h1>
                <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
                  Access high-quality courses, watch engaging video lessons, and download comprehensive study materials. Your journey to knowledge starts here.
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
        </>
      )}
    </div>
  );
}

