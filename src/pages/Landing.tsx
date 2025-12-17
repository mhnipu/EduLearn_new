import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Video, FileText, Users, Award, Zap, Clock } from 'lucide-react';
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
  layout_variant?: string | null;
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
    const { section_type, content, layout_variant } = section;

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

      case 'services':
        const services = content?.services || [];
        const servicesLayout = layout_variant || 'services-grid';
        return (
          <section key={section.id} className="py-20 px-4 bg-card/50">
            <div className="container mx-auto">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
                  {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>}
                </div>
              )}
              {services.length > 0 && (
                <div className={`grid ${servicesLayout === 'services-grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6 max-w-6xl mx-auto`}>
                  {services.map((service: any, index: number) => {
                    const IconComponent = iconMap[service.icon] || BookOpen;
                    return (
                      <Card key={index} className="border-2 hover:border-primary transition-colors">
                        {service.image && (
                          <img src={service.image} alt={service.title} className="w-full h-48 object-cover rounded-t-lg" />
                        )}
                        <CardHeader>
                          <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center mb-4">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                          <CardTitle>{service.title}</CardTitle>
                          <CardDescription>{service.description}</CardDescription>
                        </CardHeader>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );

      case 'stats':
        const stats = content?.stats || [];
        const statsLayout = layout_variant || 'stats-4col';
        return (
          <section key={section.id} className="py-20 px-4 bg-gradient-to-br from-primary/5 to-secondary/5">
            <div className="container mx-auto">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
                  {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>}
                </div>
              )}
              {stats.length > 0 && (
                <div className={`grid ${statsLayout === 'stats-4col' ? 'grid-cols-2 md:grid-cols-4' : statsLayout === 'stats-3col' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'} gap-6 max-w-6xl mx-auto`}>
                  {stats.map((stat: any, index: number) => {
                    const IconComponent = iconMap[stat.icon] || Award;
                    return (
                      <Card key={index} className="text-center border-2">
                        <CardContent className="p-6">
                          <div className="h-16 w-16 rounded-full bg-primary/10 flex items-center justify-center mx-auto mb-4">
                            <IconComponent className="h-8 w-8 text-primary" />
                          </div>
                          <div className="text-4xl font-bold mb-2">{stat.value}</div>
                          <div className="text-muted-foreground">{stat.label}</div>
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );

      case 'testimonials':
        const testimonials = content?.testimonials || [];
        const testimonialsLayout = layout_variant || 'testimonials-grid';
        return (
          <section key={section.id} className="py-20 px-4 bg-card/50">
            <div className="container mx-auto">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
                  {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>}
                </div>
              )}
              {testimonials.length > 0 && (
                <div className={`grid ${testimonialsLayout === 'testimonials-grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6 max-w-6xl mx-auto`}>
                  {testimonials.map((testimonial: any, index: number) => (
                    <Card key={index} className="border-2">
                      <CardContent className="p-6">
                        {testimonial.rating && (
                          <div className="flex mb-4">
                            {[...Array(5)].map((_, i) => (
                              <span key={i} className={i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}>★</span>
                            ))}
                          </div>
                        )}
                        <p className="text-muted-foreground mb-4 italic">"{testimonial.content}"</p>
                        <div className="flex items-center gap-3">
                          {testimonial.avatar && (
                            <img src={testimonial.avatar} alt={testimonial.name} className="h-12 w-12 rounded-full" />
                          )}
                          <div>
                            <div className="font-semibold">{testimonial.name}</div>
                            <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'pricing':
        const plans = content?.plans || [];
        const pricingLayout = layout_variant || 'pricing-3col';
        return (
          <section key={section.id} className="py-20 px-4">
            <div className="container mx-auto">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
                  {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>}
                </div>
              )}
              {plans.length > 0 && (
                <div className={`grid ${pricingLayout === 'pricing-3col' ? 'md:grid-cols-3' : pricingLayout === 'pricing-4col' ? 'md:grid-cols-4' : 'grid-cols-1'} gap-6 max-w-6xl mx-auto`}>
                  {plans.map((plan: any, index: number) => (
                    <Card key={index} className="border-2 hover:border-primary transition-colors">
                      <CardHeader>
                        <CardTitle className="text-2xl">{plan.name}</CardTitle>
                        <div className="mt-4">
                          <span className="text-4xl font-bold">{plan.price}</span>
                          {plan.period && <span className="text-muted-foreground">/{plan.period}</span>}
                        </div>
                      </CardHeader>
                      <CardContent>
                        {plan.features && Array.isArray(plan.features) && (
                          <ul className="space-y-2 mb-6">
                            {plan.features.map((feature: string, i: number) => (
                              <li key={i} className="flex items-center gap-2">
                                <span className="text-primary">✓</span>
                                <span>{feature}</span>
                              </li>
                            ))}
                          </ul>
                        )}
                        {plan.cta_text && (
                          <Link to={plan.cta_link || '#'}>
                            <Button className="w-full" size="lg">
                              {plan.cta_text}
                            </Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'faq':
        const faqs = content?.faqs || [];
        const faqLayout = layout_variant || 'faq-accordion';
        return (
          <section key={section.id} className="py-20 px-4 bg-card/50">
            <div className="container mx-auto max-w-4xl">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
                  {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>}
                </div>
              )}
              {faqs.length > 0 && (
                <div className="space-y-4">
                  {faqs.map((faq: any, index: number) => (
                    <Card key={index} className="border-2">
                      <CardHeader>
                        <CardTitle className="text-lg">{faq.question}</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <CardDescription className="text-base">{faq.answer}</CardDescription>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'timeline':
        const events = content?.events || [];
        return (
          <section key={section.id} className="py-20 px-4">
            <div className="container mx-auto max-w-4xl">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
                  {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>}
                </div>
              )}
              {events.length > 0 && (
                <div className="space-y-8">
                  {events.map((event: any, index: number) => {
                    const IconComponent = iconMap[event.icon] || Clock;
                    return (
                      <div key={index} className="flex gap-4">
                        <div className="flex-shrink-0">
                          <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                            <IconComponent className="h-6 w-6 text-primary" />
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="font-semibold text-sm text-muted-foreground mb-1">{event.date}</div>
                          <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                          <p className="text-muted-foreground">{event.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </section>
        );

      case 'gallery':
        const images = content?.images || [];
        const galleryLayout = layout_variant || 'gallery-grid';
        return (
          <section key={section.id} className="py-20 px-4 bg-card/50">
            <div className="container mx-auto">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
                  {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>}
                </div>
              )}
              {images.length > 0 && (
                <div className={`grid ${galleryLayout === 'gallery-grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4 max-w-6xl mx-auto`}>
                  {images.map((image: any, index: number) => (
                    <div key={index} className="relative aspect-square overflow-hidden rounded-lg border-2 hover:border-primary transition-colors">
                      <img src={image.url} alt={image.alt || image.caption} className="w-full h-full object-cover" />
                      {image.caption && (
                        <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm">
                          {image.caption}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'blog':
        const posts = content?.posts || [];
        const blogLayout = layout_variant || 'blog-grid';
        return (
          <section key={section.id} className="py-20 px-4">
            <div className="container mx-auto">
              {(content?.title || content?.subtitle) && (
                <div className="text-center mb-12">
                  {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
                  {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{content.subtitle}</p>}
                </div>
              )}
              {posts.length > 0 && (
                <div className={`grid ${blogLayout === 'blog-grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6 max-w-6xl mx-auto`}>
                  {posts.map((post: any, index: number) => (
                    <Card key={index} className="border-2 hover:border-primary transition-colors">
                      {post.image && (
                        <img src={post.image} alt={post.title} className="w-full h-48 object-cover rounded-t-lg" />
                      )}
                      <CardHeader>
                        <CardTitle>{post.title}</CardTitle>
                        {post.date && <CardDescription>{post.date}</CardDescription>}
                      </CardHeader>
                      <CardContent>
                        <CardDescription>{post.excerpt}</CardDescription>
                        {post.link && (
                          <Link to={post.link} className="mt-4 inline-block">
                            <Button variant="link">Read more →</Button>
                          </Link>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              )}
            </div>
          </section>
        );

      case 'custom':
        // Render custom HTML content if provided
        if (content?.html) {
          return (
            <section key={section.id} className="py-20 px-4">
              <div className="container mx-auto">
                {content?.css && <style>{content.css}</style>}
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

