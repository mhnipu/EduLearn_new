import { useEffect, useState, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion, useReducedMotion, useInView } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { GraduationCap, BookOpen, Video, FileText, Users, Award, Zap, Clock } from 'lucide-react';
import { useAuth } from '@/lib/auth';
import { supabase } from '@/integrations/supabase/client';
import { getDashboardPath } from '@/lib/navigation';

// Icon mapping for dynamic icon rendering
const iconMap: Record<string, any> = {
  GraduationCap,
  BookOpen,
  Video,
  FileText,
  Users,
  Award,
  Zap,
  Clock,
};

// Enhanced animation variants - respecting reduced motion
const getAnimationVariants = (reducedMotion: boolean) => ({
  fadeInUp: {
    initial: reducedMotion ? { opacity: 1 } : { opacity: 0, y: 40 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: 0.8, ease: [0.16, 1, 0.3, 1] }
  },
  fadeIn: {
    initial: reducedMotion ? { opacity: 1 } : { opacity: 0 },
    animate: { opacity: 1 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  },
  scaleIn: {
    initial: reducedMotion ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.9 },
    animate: { opacity: 1, scale: 1 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  },
  slideInLeft: {
    initial: reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: -50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  },
  slideInRight: {
    initial: reducedMotion ? { opacity: 1, x: 0 } : { opacity: 0, x: 50 },
    animate: { opacity: 1, x: 0 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  },
  staggerContainer: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: { staggerChildren: reducedMotion ? 0 : 0.15, delayChildren: 0.3 }
  },
  staggerItem: {
    initial: reducedMotion ? { opacity: 1 } : { opacity: 0, y: 30, scale: 0.95 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
  },
  rotateIn: {
    initial: reducedMotion ? { opacity: 1, rotate: 0 } : { opacity: 0, rotate: -10 },
    animate: { opacity: 1, rotate: 0 },
    transition: { duration: 0.7, ease: [0.16, 1, 0.3, 1] }
  }
});


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

// Section components - each handles its own hooks
const HeroSection = ({ section, content, user, reducedMotion, variants }: { section: PageSection; content: any; user: any; reducedMotion: boolean; variants: any }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-50px' });
  
  return (
    <section ref={ref} className="relative py-24 md:py-32 px-4 overflow-hidden">
      {/* Enhanced background with animated gradients */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      <motion.div
        className="absolute inset-0 opacity-30"
        animate={inView ? {
          background: [
            'radial-gradient(circle at 20% 50%, rgba(var(--primary), 0.1) 0%, transparent 50%)',
            'radial-gradient(circle at 80% 50%, rgba(var(--primary), 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 20% 50%, rgba(var(--primary), 0.1) 0%, transparent 50%)',
          ]
        } : {}}
        transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Animated grid pattern */}
      <div className="absolute inset-0 bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:24px_24px] [mask-image:radial-gradient(ellipse_80%_50%_at_50%_0%,#000_70%,transparent_110%)]" />
      
      <div className="container mx-auto relative z-10">
        <div className="max-w-4xl mx-auto text-center space-y-10">
          {content?.badge && (
            <motion.div
              initial={variants.fadeIn.initial}
              animate={inView ? variants.fadeIn.animate : variants.fadeIn.initial}
              transition={{ ...variants.fadeIn.transition, delay: 0.2 }}
              whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-primary/20 via-primary/10 to-primary/20 rounded-full text-sm font-semibold text-primary border border-primary/30 backdrop-blur-sm shadow-lg shadow-primary/10"
            >
              <motion.div
                animate={inView ? { rotate: [0, 10, -10, 0] } : {}}
                transition={{ duration: 2, repeat: Infinity, repeatDelay: 3 }}
              >
                <Zap className="h-4 w-4" />
              </motion.div>
              {content.badge}
            </motion.div>
          )}
          
          <motion.h1
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={{ ...variants.fadeInUp.transition, delay: 0.3 }}
            className="text-5xl md:text-7xl lg:text-8xl font-extrabold tracking-tight leading-[1.1] bg-clip-text text-transparent bg-gradient-to-b from-foreground via-foreground to-foreground/80"
          >
            {content?.title_line_1 || 'Learn Anything,'}
            {content?.title_line_2 && (
              <motion.span
                initial={variants.fadeInUp.initial}
                animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
                transition={{ ...variants.fadeInUp.transition, delay: 0.4 }}
                className="block mt-2 bg-gradient-to-r from-primary via-primary/90 to-primary bg-clip-text text-transparent"
              >
                {content.title_line_2}
              </motion.span>
            )}
          </motion.h1>
          
          {content?.subtitle && (
            <motion.p
              initial={variants.fadeInUp.initial}
              animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
              transition={{ ...variants.fadeInUp.transition, delay: 0.5 }}
              className="text-xl md:text-2xl text-muted-foreground max-w-2xl mx-auto leading-relaxed font-light"
            >
              {content.subtitle}
            </motion.p>
          )}
          
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={{ ...variants.fadeInUp.transition, delay: 0.6 }}
            className="flex flex-col sm:flex-row gap-4 justify-center pt-6"
          >
            {user ? (
              <>
                {content?.cta_secondary && (
                  <motion.div
                    whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
                    whileTap={reducedMotion ? {} : { scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Link to={content.cta_secondary.link || '/courses'}>
                      <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                        {content.cta_secondary.text || 'Browse Courses'}
                        <motion.div
                          animate={{ x: [0, 4, 0] }}
                          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <BookOpen className="ml-2 h-5 w-5" />
                        </motion.div>
                      </Button>
                    </Link>
                  </motion.div>
                )}
                <motion.div
                  whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
                  whileTap={reducedMotion ? {} : { scale: 0.98 }}
                  transition={{ type: "spring", stiffness: 400, damping: 20 }}
                >
                  <Link to="/dashboard">
                    <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 border-2 hover:bg-accent/50 backdrop-blur-sm transition-all duration-300">
                      Go to Dashboard
                    </Button>
                  </Link>
                </motion.div>
              </>
            ) : (
              <>
                {content?.cta_primary && (
                  <motion.div
                    whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
                    whileTap={reducedMotion ? {} : { scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Link to={content.cta_primary.link || '/auth'}>
                      <Button size="lg" className="w-full sm:w-auto text-base px-8 py-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                        {content.cta_primary.text || 'Get Started Free'}
                        <motion.div
                          animate={{ rotate: [0, 10, -10, 0] }}
                          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                        >
                          <GraduationCap className="ml-2 h-5 w-5" />
                        </motion.div>
                      </Button>
                    </Link>
                  </motion.div>
                )}
                {content?.cta_secondary && (
                  <motion.div
                    whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
                    whileTap={reducedMotion ? {} : { scale: 0.98 }}
                    transition={{ type: "spring", stiffness: 400, damping: 20 }}
                  >
                    <Link to={content.cta_secondary.link || '/courses'}>
                      <Button size="lg" variant="outline" className="w-full sm:w-auto text-base px-8 py-6 border-2 hover:bg-accent/50 backdrop-blur-sm transition-all duration-300">
                        {content.cta_secondary.text || 'Explore Courses'}
                      </Button>
                    </Link>
                  </motion.div>
                )}
              </>
            )}
          </motion.div>
        </div>
      </div>
    </section>
  );
};

const FeaturesSection = ({ section, content, reducedMotion, variants }: { section: PageSection; content: any; reducedMotion: boolean; variants: any }) => {
  const features = content?.features || [];
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="relative py-24 md:py-32 px-4 bg-gradient-to-b from-card/50 via-background to-card/50 overflow-hidden">
      {/* Subtle background pattern */}
      <div className="absolute inset-0 opacity-[0.02] bg-[radial-gradient(circle_at_1px_1px,rgb(0,0,0)_1px,transparent_0)] [background-size:32px_32px]" />
      
      <div className="container mx-auto relative z-10">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16 md:mb-20"
          >
            {content?.title && (
              <motion.h2 
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent"
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
                transition={{ duration: 0.3 }}
              >
                {content.title}
              </motion.h2>
            )}
            {content?.subtitle && (
              <motion.p 
                className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-light"
                initial={variants.fadeInUp.initial}
                animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
                transition={{ ...variants.fadeInUp.transition, delay: 0.2 }}
              >
                {content.subtitle}
              </motion.p>
            )}
          </motion.div>
        )}
        
        {features.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 md:gap-8 max-w-7xl mx-auto"
          >
            {features.map((feature: any, index: number) => {
              const IconComponent = iconMap[feature.icon] || BookOpen;
              return (
                <motion.div
                  key={index}
                  variants={variants.staggerItem}
                  whileHover={reducedMotion ? {} : { 
                    y: -12, 
                    scale: 1.02,
                    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                  }}
                  className="h-full group"
                >
                  <Card className="border-2 hover:border-primary/50 transition-all duration-500 h-full relative overflow-hidden bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:shadow-primary/10">
                    {/* Gradient overlay on hover */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/0 group-hover:to-primary/5 transition-all duration-500" />
                    
                    <CardHeader className="pb-4 relative z-10">
                      <motion.div
                        whileHover={reducedMotion ? {} : { 
                          scale: 1.15, 
                          rotate: [0, -5, 5, 0],
                          transition: { duration: 0.5 }
                        }}
                        className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300"
                      >
                        <IconComponent className="h-7 w-7 text-primary" />
                      </motion.div>
                      <CardTitle className="mb-3 text-xl font-bold group-hover:text-primary transition-colors duration-300">
                        {feature.title}
                      </CardTitle>
                      <CardDescription className="leading-relaxed text-base">
                        {feature.description}
                      </CardDescription>
                    </CardHeader>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

// CTA Section Component
const CTASection = ({ content, reducedMotion, variants }: { content: any; reducedMotion: boolean; variants: any }) => {
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="relative py-24 md:py-32 px-4 overflow-hidden">
      {/* Animated background */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
      <motion.div
        className="absolute inset-0 opacity-20"
        animate={inView ? {
          background: [
            'radial-gradient(circle at 30% 50%, rgba(var(--primary), 0.15) 0%, transparent 50%)',
            'radial-gradient(circle at 70% 50%, rgba(var(--primary), 0.2) 0%, transparent 50%)',
            'radial-gradient(circle at 30% 50%, rgba(var(--primary), 0.15) 0%, transparent 50%)',
          ]
        } : {}}
        transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
      />
      
      <div className="container mx-auto relative z-10">
        <motion.div
          initial={variants.scaleIn.initial}
          animate={inView ? variants.scaleIn.animate : variants.scaleIn.initial}
          transition={variants.scaleIn.transition}
          whileHover={reducedMotion ? {} : { scale: 1.01 }}
        >
          <Card className="border-2 border-primary/50 bg-gradient-to-br from-primary/10 via-card/80 to-secondary/10 max-w-4xl mx-auto shadow-2xl shadow-primary/10 backdrop-blur-md relative overflow-hidden">
            {/* Animated border glow */}
            <div className="absolute inset-0 bg-gradient-to-r from-primary/0 via-primary/20 to-primary/0 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            
            <CardContent className="p-12 md:p-16 lg:p-20 text-center relative z-10">
              <motion.div
                initial={variants.fadeIn.initial}
                animate={inView ? variants.fadeIn.animate : variants.fadeIn.initial}
                transition={{ ...variants.fadeIn.transition, delay: 0.2 }}
                whileHover={reducedMotion ? {} : { 
                  scale: 1.15, 
                  rotate: [0, -10, 10, -10, 0],
                  transition: { duration: 0.6 }
                }}
                className="inline-block"
              >
                <div className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/30 to-primary/10 flex items-center justify-center mb-8 shadow-lg shadow-primary/20">
                  <GraduationCap className="h-10 w-10 text-primary" />
                </div>
              </motion.div>
              {content?.title && (
                <motion.h2
                  initial={variants.fadeInUp.initial}
                  animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
                  transition={{ ...variants.fadeInUp.transition, delay: 0.3 }}
                  className="text-3xl md:text-4xl lg:text-5xl font-extrabold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent"
                >
                  {content.title}
                </motion.h2>
              )}
              {content?.subtitle && (
                <motion.p
                  initial={variants.fadeInUp.initial}
                  animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
                  transition={{ ...variants.fadeInUp.transition, delay: 0.4 }}
                  className="text-muted-foreground text-lg md:text-xl mb-10 max-w-2xl mx-auto leading-relaxed font-light"
                >
                  {content.subtitle}
                </motion.p>
              )}
              {content?.cta_text && (
                <motion.div
                  initial={variants.fadeInUp.initial}
                  animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
                  transition={{ ...variants.fadeInUp.transition, delay: 0.5 }}
                  whileHover={reducedMotion ? {} : { scale: 1.05, y: -2 }}
                  whileTap={reducedMotion ? {} : { scale: 0.98 }}
                >
                  <Link to={content.cta_link || '/auth'}>
                    <Button size="lg" className="text-base px-8 py-6 bg-gradient-to-r from-primary to-primary/90 hover:from-primary/90 hover:to-primary shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30 transition-all duration-300">
                      {content.cta_text}
                      <motion.div
                        animate={{ x: [0, 4, 0] }}
                        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
                      >
                        <GraduationCap className="ml-2 h-5 w-5" />
                      </motion.div>
                    </Button>
                  </Link>
                </motion.div>
              )}
            </CardContent>
          </Card>
        </motion.div>
      </div>
    </section>
  );
};

// Services Section Component
const ServicesSection = ({ section, content, layout_variant, reducedMotion, variants }: { section: PageSection; content: any; layout_variant?: string | null; reducedMotion: boolean; variants: any }) => {
  const services = content?.services || [];
  const servicesLayout = layout_variant || 'services-grid';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="relative py-24 md:py-32 px-4 bg-gradient-to-b from-background via-card/30 to-background overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="container mx-auto relative z-10">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16 md:mb-20"
          >
            {content?.title && (
              <motion.h2 
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent"
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
              >
                {content.title}
              </motion.h2>
            )}
            {content?.subtitle && (
              <motion.p 
                className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-light"
                initial={variants.fadeInUp.initial}
                animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
                transition={{ ...variants.fadeInUp.transition, delay: 0.2 }}
              >
                {content.subtitle}
              </motion.p>
            )}
          </motion.div>
        )}
        {services.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className={`grid ${servicesLayout === 'services-grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6 md:gap-8 max-w-7xl mx-auto`}
          >
            {services.map((service: any, index: number) => {
              const IconComponent = iconMap[service.icon] || BookOpen;
              return (
                <motion.div
                  key={index}
                  variants={variants.staggerItem}
                  whileHover={reducedMotion ? {} : { 
                    y: -12, 
                    scale: 1.02,
                    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                  }}
                  className="h-full group"
                >
                  <Card className="border-2 hover:border-primary/50 transition-all duration-500 h-full overflow-hidden bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:shadow-primary/10 relative">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/0 group-hover:to-primary/5 transition-all duration-500" />
                    
                    {service.image && (
                      <motion.div
                        whileHover={reducedMotion ? {} : { scale: 1.1 }}
                        transition={{ duration: 0.5 }}
                        className="overflow-hidden relative h-56"
                      >
                        <img src={service.image} alt={service.title} className="w-full h-full object-cover" />
                        <div className="absolute inset-0 bg-gradient-to-t from-card/80 via-transparent to-transparent" />
                      </motion.div>
                    )}
                    <CardHeader className="pb-4 relative z-10">
                      <motion.div
                        whileHover={reducedMotion ? {} : { 
                          scale: 1.15, 
                          rotate: [0, -5, 5, 0],
                          transition: { duration: 0.5 }
                        }}
                        className="h-14 w-14 rounded-xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center mb-6 group-hover:shadow-lg group-hover:shadow-primary/20 transition-all duration-300"
                      >
                        <IconComponent className="h-7 w-7 text-primary" />
                      </motion.div>
                      <CardTitle className="mb-3 text-xl font-bold group-hover:text-primary transition-colors duration-300">
                        {service.title}
                      </CardTitle>
                      <CardDescription className="leading-relaxed text-base">
                        {service.description}
                      </CardDescription>
                    </CardHeader>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

// Stats Section Component
const StatsSection = ({ section, content, layout_variant, reducedMotion, variants }: { section: PageSection; content: any; layout_variant?: string | null; reducedMotion: boolean; variants: any }) => {
  const stats = content?.stats || [];
  const statsLayout = layout_variant || 'stats-4col';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="relative py-24 md:py-32 px-4 bg-gradient-to-br from-primary/10 via-background to-secondary/10 overflow-hidden">
      {/* Animated background pattern */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(var(--primary),0.1)_0%,transparent_50%)]" />
      </div>
      
      <div className="container mx-auto relative z-10">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16 md:mb-20"
          >
            {content?.title && (
              <motion.h2 
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent"
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
              >
                {content.title}
              </motion.h2>
            )}
            {content?.subtitle && (
              <motion.p 
                className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-light"
                initial={variants.fadeInUp.initial}
                animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
                transition={{ ...variants.fadeInUp.transition, delay: 0.2 }}
              >
                {content.subtitle}
              </motion.p>
            )}
          </motion.div>
        )}
        {stats.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className={`grid ${statsLayout === 'stats-4col' ? 'grid-cols-2 md:grid-cols-4' : statsLayout === 'stats-3col' ? 'grid-cols-1 md:grid-cols-3' : 'grid-cols-1'} gap-6 md:gap-8 max-w-7xl mx-auto`}
          >
            {stats.map((stat: any, index: number) => {
              const IconComponent = iconMap[stat.icon] || Award;
              return (
                <motion.div
                  key={index}
                  variants={variants.staggerItem}
                  whileHover={reducedMotion ? {} : { 
                    y: -10, 
                    scale: 1.05,
                    transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                  }}
                  className="h-full group"
                >
                  <Card className="text-center border-2 h-full bg-card/60 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:shadow-primary/20 transition-all duration-500 relative overflow-hidden">
                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/10 group-hover:via-primary/5 group-hover:to-primary/10 transition-all duration-500" />
                    
                    <CardContent className="p-8 relative z-10">
                      <motion.div
                        whileHover={reducedMotion ? {} : { 
                          scale: 1.2, 
                          rotate: [0, -10, 10, 0],
                          transition: { duration: 0.5 }
                        }}
                        className="h-20 w-20 rounded-2xl bg-gradient-to-br from-primary/20 via-primary/10 to-primary/20 flex items-center justify-center mx-auto mb-6 group-hover:shadow-lg group-hover:shadow-primary/30 transition-all duration-300"
                      >
                        <IconComponent className="h-10 w-10 text-primary" />
                      </motion.div>
                      <motion.div 
                        className="text-5xl md:text-6xl font-extrabold mb-3 bg-gradient-to-r from-foreground via-primary to-foreground bg-clip-text text-transparent"
                        initial={{ scale: 0 }}
                        animate={inView ? { scale: 1 } : { scale: 0 }}
                        transition={{ delay: 0.3 + index * 0.1, type: "spring", stiffness: 200, damping: 15 }}
                      >
                        {stat.value}
                      </motion.div>
                      <div className="text-muted-foreground text-base font-medium">{stat.label}</div>
                    </CardContent>
                    
                    {/* Shine effect */}
                    <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

// Testimonials Section Component
const TestimonialsSection = ({ section, content, layout_variant, reducedMotion, variants }: { section: PageSection; content: any; layout_variant?: string | null; reducedMotion: boolean; variants: any }) => {
  const testimonials = content?.testimonials || [];
  const testimonialsLayout = layout_variant || 'testimonials-grid';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="relative py-24 md:py-32 px-4 bg-gradient-to-b from-background via-card/30 to-background overflow-hidden">
      <div className="absolute inset-0 opacity-[0.03] bg-[linear-gradient(to_right,#80808012_1px,transparent_1px),linear-gradient(to_bottom,#80808012_1px,transparent_1px)] bg-[size:40px_40px]" />
      
      <div className="container mx-auto relative z-10">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16 md:mb-20"
          >
            {content?.title && (
              <motion.h2 
                className="text-4xl md:text-5xl lg:text-6xl font-extrabold mb-6 bg-gradient-to-r from-foreground via-foreground to-foreground/80 bg-clip-text text-transparent"
                whileHover={reducedMotion ? {} : { scale: 1.02 }}
              >
                {content.title}
              </motion.h2>
            )}
            {content?.subtitle && (
              <motion.p 
                className="text-muted-foreground text-lg md:text-xl max-w-3xl mx-auto leading-relaxed font-light"
                initial={variants.fadeInUp.initial}
                animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
                transition={{ ...variants.fadeInUp.transition, delay: 0.2 }}
              >
                {content.subtitle}
              </motion.p>
            )}
          </motion.div>
        )}
        {testimonials.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className={`grid ${testimonialsLayout === 'testimonials-grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-6 md:gap-8 max-w-7xl mx-auto`}
          >
            {testimonials.map((testimonial: any, index: number) => (
              <motion.div
                key={index}
                variants={variants.staggerItem}
                whileHover={reducedMotion ? {} : { 
                  y: -10, 
                  scale: 1.02,
                  transition: { duration: 0.3, ease: [0.16, 1, 0.3, 1] }
                }}
                className="h-full group"
              >
                <Card className="border-2 h-full bg-card/50 backdrop-blur-sm shadow-lg hover:shadow-2xl hover:shadow-primary/10 transition-all duration-500 relative overflow-hidden">
                  {/* Gradient overlay */}
                  <div className="absolute inset-0 bg-gradient-to-br from-primary/0 via-primary/0 to-primary/0 group-hover:from-primary/5 group-hover:via-primary/0 group-hover:to-primary/5 transition-all duration-500" />
                  
                  <CardContent className="p-8 relative z-10">
                    {testimonial.rating && (
                      <motion.div 
                        className="flex mb-6 gap-1"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={inView ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.8 }}
                        transition={{ delay: 0.2 + index * 0.1 }}
                      >
                        {[...Array(5)].map((_, i) => (
                          <motion.span 
                            key={i} 
                            className={i < testimonial.rating ? 'text-yellow-400' : 'text-gray-300'}
                            initial={{ scale: 0, rotate: -180 }}
                            animate={inView ? { scale: 1, rotate: 0 } : { scale: 0, rotate: -180 }}
                            transition={{ delay: 0.3 + index * 0.1 + i * 0.05, type: "spring", stiffness: 200 }}
                          >
                            ★
                          </motion.span>
                        ))}
                      </motion.div>
                    )}
                    <p className="text-muted-foreground mb-6 italic leading-relaxed text-base relative">
                      <span className="absolute -top-2 -left-2 text-4xl text-primary/20 font-serif">"</span>
                      {testimonial.content}
                      <span className="absolute -bottom-4 -right-2 text-4xl text-primary/20 font-serif">"</span>
                    </p>
                    <div className="flex items-center gap-4 pt-4 border-t border-border/50">
                      {testimonial.avatar && (
                        <motion.div
                          whileHover={reducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                          className="relative"
                        >
                          <img
                            src={testimonial.avatar}
                            alt={testimonial.name}
                            className="h-14 w-14 rounded-full border-2 border-primary/20"
                          />
                          <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/20 to-transparent" />
                        </motion.div>
                      )}
                      <div>
                        <div className="font-semibold text-base">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.role}</div>
                      </div>
                    </div>
                  </CardContent>
                  
                  {/* Shine effect */}
                  <div className="absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 bg-gradient-to-r from-transparent via-white/10 to-transparent" />
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

// Pricing Section Component
const PricingSection = ({ section, content, layout_variant, reducedMotion, variants }: { section: PageSection; content: any; layout_variant?: string | null; reducedMotion: boolean; variants: any }) => {
  const plans = content?.plans || [];
  const pricingLayout = layout_variant || 'pricing-3col';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="py-24 md:py-32 px-4">
      <div className="container mx-auto">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16"
          >
            {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
            {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{content.subtitle}</p>}
          </motion.div>
        )}
        {plans.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className={`grid ${pricingLayout === 'pricing-3col' ? 'md:grid-cols-3' : pricingLayout === 'pricing-4col' ? 'md:grid-cols-4' : 'grid-cols-1'} gap-8 max-w-6xl mx-auto`}
          >
            {plans.map((plan: any, index: number) => (
              <motion.div
                key={index}
                variants={variants.staggerItem}
                whileHover={reducedMotion ? {} : { y: -8, scale: 1.02, transition: { duration: 0.2 } }}
                className="h-full"
              >
                <Card className="border-2 hover:border-primary transition-all duration-300 h-full">
                  <CardHeader>
                    <CardTitle className="text-2xl">{plan.name}</CardTitle>
                    <div className="mt-4">
                      <span className="text-4xl font-bold">{plan.price}</span>
                      {plan.period && <span className="text-muted-foreground">/{plan.period}</span>}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {plan.features && Array.isArray(plan.features) && (
                      <ul className="space-y-3 mb-6">
                        {plan.features.map((feature: string, i: number) => (
                          <li key={i} className="flex items-center gap-2">
                            <span className="text-primary">✓</span>
                            <span className="leading-relaxed">{feature}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                    {plan.cta_text && (
                      <motion.div
                        whileHover={reducedMotion ? {} : { scale: 1.05 }}
                        whileTap={reducedMotion ? {} : { scale: 0.95 }}
                      >
                        <Link to={plan.cta_link || '#'}>
                          <Button className="w-full" size="lg">
                            {plan.cta_text}
                          </Button>
                        </Link>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

// FAQ Section Component
const FAQSection = ({ section, content, layout_variant, reducedMotion, variants }: { section: PageSection; content: any; layout_variant?: string | null; reducedMotion: boolean; variants: any }) => {
  const faqs = content?.faqs || [];
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="py-24 md:py-32 px-4 bg-card/50">
      <div className="container mx-auto max-w-4xl">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16"
          >
            {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
            {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{content.subtitle}</p>}
          </motion.div>
        )}
        {faqs.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className="space-y-4"
          >
            {faqs.map((faq: any, index: number) => (
              <motion.div
                key={index}
                variants={variants.staggerItem}
                whileHover={reducedMotion ? {} : { x: 5, transition: { duration: 0.2 } }}
              >
                <Card className="border-2">
                  <CardHeader>
                    <CardTitle className="text-lg">{faq.question}</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="text-base leading-relaxed">{faq.answer}</CardDescription>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

// Timeline Section Component
const TimelineSection = ({ section, content, reducedMotion, variants }: { section: PageSection; content: any; reducedMotion: boolean; variants: any }) => {
  const events = content?.events || [];
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="py-24 md:py-32 px-4">
      <div className="container mx-auto max-w-4xl">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16"
          >
            {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
            {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{content.subtitle}</p>}
          </motion.div>
        )}
        {events.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className="space-y-8"
          >
            {events.map((event: any, index: number) => {
              const IconComponent = iconMap[event.icon] || Clock;
              return (
                <motion.div
                  key={index}
                  variants={variants.staggerItem}
                  whileHover={reducedMotion ? {} : { x: 10, transition: { duration: 0.2 } }}
                  className="flex gap-6"
                >
                  <div className="flex-shrink-0">
                    <motion.div
                      whileHover={reducedMotion ? {} : { scale: 1.1, rotate: 5 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                      className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center"
                    >
                      <IconComponent className="h-6 w-6 text-primary" />
                    </motion.div>
                  </div>
                  <div className="flex-1">
                    <div className="font-semibold text-sm text-muted-foreground mb-1">{event.date}</div>
                    <h3 className="text-xl font-bold mb-2">{event.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{event.description}</p>
                  </div>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </section>
  );
};

// Gallery Section Component
const GallerySection = ({ section, content, layout_variant, reducedMotion, variants }: { section: PageSection; content: any; layout_variant?: string | null; reducedMotion: boolean; variants: any }) => {
  const images = content?.images || [];
  const galleryLayout = layout_variant || 'gallery-grid';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="py-24 md:py-32 px-4 bg-card/50">
      <div className="container mx-auto">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16"
          >
            {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
            {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{content.subtitle}</p>}
          </motion.div>
        )}
        {images.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className={`grid ${galleryLayout === 'gallery-grid' ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' : 'grid-cols-1'} gap-4 max-w-6xl mx-auto`}
          >
            {images.map((image: any, index: number) => (
              <motion.div
                key={index}
                variants={variants.staggerItem}
                whileHover={reducedMotion ? {} : { scale: 1.05, transition: { duration: 0.2 } }}
                className="relative aspect-square overflow-hidden rounded-lg border-2 hover:border-primary transition-all duration-300"
              >
                <motion.img
                  whileHover={reducedMotion ? {} : { scale: 1.1 }}
                  transition={{ duration: 0.3 }}
                  src={image.url}
                  alt={image.alt || image.caption}
                  className="w-full h-full object-cover"
                />
                {image.caption && (
                  <motion.div
                    initial={{ opacity: 0 }}
                    whileHover={{ opacity: 1 }}
                    className="absolute bottom-0 left-0 right-0 bg-black/50 text-white p-2 text-sm"
                  >
                    {image.caption}
                  </motion.div>
                )}
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

// Blog Section Component
const BlogSection = ({ section, content, layout_variant, reducedMotion, variants }: { section: PageSection; content: any; layout_variant?: string | null; reducedMotion: boolean; variants: any }) => {
  const posts = content?.posts || [];
  const blogLayout = layout_variant || 'blog-grid';
  const ref = useRef(null);
  const inView = useInView(ref, { once: true, margin: '-100px' });
  
  return (
    <section ref={ref} className="py-24 md:py-32 px-4">
      <div className="container mx-auto">
        {(content?.title || content?.subtitle) && (
          <motion.div
            initial={variants.fadeInUp.initial}
            animate={inView ? variants.fadeInUp.animate : variants.fadeInUp.initial}
            transition={variants.fadeInUp.transition}
            className="text-center mb-16"
          >
            {content?.title && <h2 className="text-3xl md:text-4xl font-bold mb-4">{content.title}</h2>}
            {content?.subtitle && <p className="text-muted-foreground text-lg max-w-2xl mx-auto leading-relaxed">{content.subtitle}</p>}
          </motion.div>
        )}
        {posts.length > 0 && (
          <motion.div
            initial={variants.staggerContainer.initial}
            animate={inView ? variants.staggerContainer.animate : variants.staggerContainer.initial}
            transition={variants.staggerContainer.transition}
            className={`grid ${blogLayout === 'blog-grid' ? 'md:grid-cols-2 lg:grid-cols-3' : 'grid-cols-1'} gap-8 max-w-6xl mx-auto`}
          >
            {posts.map((post: any, index: number) => (
              <motion.div
                key={index}
                variants={variants.staggerItem}
                whileHover={reducedMotion ? {} : { y: -8, transition: { duration: 0.2 } }}
                className="h-full"
              >
                <Card className="border-2 hover:border-primary transition-all duration-300 h-full overflow-hidden">
                  {post.image && (
                    <motion.div
                      whileHover={reducedMotion ? {} : { scale: 1.05 }}
                      transition={{ duration: 0.3 }}
                      className="overflow-hidden"
                    >
                      <img src={post.image} alt={post.title} className="w-full h-48 object-cover" />
                    </motion.div>
                  )}
                  <CardHeader className="pb-4">
                    <CardTitle className="mb-2">{post.title}</CardTitle>
                    {post.date && <CardDescription>{post.date}</CardDescription>}
                  </CardHeader>
                  <CardContent>
                    <CardDescription className="leading-relaxed mb-4">{post.excerpt}</CardDescription>
                    {post.link && (
                      <motion.div
                        whileHover={reducedMotion ? {} : { x: 5 }}
                        transition={{ duration: 0.2 }}
                      >
                        <Link to={post.link} className="inline-block">
                          <Button variant="link">Read more →</Button>
                        </Link>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>
    </section>
  );
};

export default function Landing() {
  const { user, role, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [sections, setSections] = useState<PageSection[]>([]);
  const [loading, setLoading] = useState(true);
  const reducedMotion = useReducedMotion();
  const variants = getAnimationVariants(!!reducedMotion);

  // Protect landing page: Redirect authenticated users (guardians, teachers, students) away
  useEffect(() => {
    if (!authLoading && user && role) {
      // Only allow unauthenticated users or admins/super_admins to view landing page
      if (!['super_admin', 'admin'].includes(role)) {
        // Redirect to appropriate dashboard based on role
        navigate(getDashboardPath(role), { replace: true });
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

  // Render section based on type - now uses components that handle their own hooks
  const renderSection = (section: PageSection) => {
    const { section_type, content, layout_variant } = section;

    switch (section_type) {
      case 'hero':
        return <HeroSection key={section.id} section={section} content={content} user={user} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'features':
        return <FeaturesSection key={section.id} section={section} content={content} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'cta':
        // Only show CTA section if user is not logged in (unless content specifies otherwise)
        if (user && !content?.show_when_logged_in) {
          return null;
        }
        // Use a component defined at top level
        return <CTASection key={section.id} content={content} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'services':
        return <ServicesSection key={section.id} section={section} content={content} layout_variant={layout_variant} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'stats':
        return <StatsSection key={section.id} section={section} content={content} layout_variant={layout_variant} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'testimonials':
        return <TestimonialsSection key={section.id} section={section} content={content} layout_variant={layout_variant} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'pricing':
        return <PricingSection key={section.id} section={section} content={content} layout_variant={layout_variant} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'faq':
        return <FAQSection key={section.id} section={section} content={content} layout_variant={layout_variant} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'timeline':
        return <TimelineSection key={section.id} section={section} content={content} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'gallery':
        return <GallerySection key={section.id} section={section} content={content} layout_variant={layout_variant} reducedMotion={!!reducedMotion} variants={variants} />;

      case 'blog':
        return <BlogSection key={section.id} section={section} content={content} layout_variant={layout_variant} reducedMotion={!!reducedMotion} variants={variants} />;

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
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="min-h-screen flex items-center justify-center"
      >
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
          className="rounded-full h-8 w-8 border-b-2 border-primary"
        />
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="min-h-screen"
    >
      {sections.length > 0 ? (
        sections.map(renderSection)
      ) : (
        // Fallback to default content if no sections found
        <section className="relative py-24 md:py-32 px-4 overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-background to-secondary/10" />
          <div className="container mx-auto relative z-10">
            <motion.div
              initial={variants.fadeInUp.initial}
              animate={variants.fadeInUp.animate}
              transition={variants.fadeInUp.transition}
              className="max-w-4xl mx-auto text-center space-y-10"
            >
              <motion.div
                initial={variants.fadeIn.initial}
                animate={variants.fadeIn.animate}
                transition={{ ...variants.fadeIn.transition, delay: 0.2 }}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary/10 rounded-full text-sm font-medium text-primary border border-primary/20"
              >
                <Zap className="h-4 w-4" />
                Modern E-Learning Platform
              </motion.div>
              <motion.h1
                initial={variants.fadeInUp.initial}
                animate={variants.fadeInUp.animate}
                transition={{ ...variants.fadeInUp.transition, delay: 0.3 }}
                className="text-5xl md:text-7xl font-bold tracking-tight leading-tight"
              >
                Learn Anything,
                <motion.span
                  initial={variants.fadeInUp.initial}
                  animate={variants.fadeInUp.animate}
                  transition={{ ...variants.fadeInUp.transition, delay: 0.4 }}
                  className="text-primary block mt-2"
                >
                  Anytime, Anywhere
                </motion.span>
              </motion.h1>
              <motion.p
                initial={variants.fadeInUp.initial}
                animate={variants.fadeInUp.animate}
                transition={{ ...variants.fadeInUp.transition, delay: 0.5 }}
                className="text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed"
              >
                Access high-quality courses, watch engaging video lessons, and download comprehensive study materials. Your journey to knowledge starts here.
              </motion.p>
              <motion.div
                initial={variants.fadeInUp.initial}
                animate={variants.fadeInUp.animate}
                transition={{ ...variants.fadeInUp.transition, delay: 0.6 }}
                className="flex flex-col sm:flex-row gap-4 justify-center pt-4"
              >
                {user ? (
                  <>
                    <motion.div
                      whileHover={reducedMotion ? {} : { scale: 1.05 }}
                      whileTap={reducedMotion ? {} : { scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Link to="/courses">
                        <Button size="lg" className="w-full sm:w-auto">
                          Browse Courses
                          <BookOpen className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div
                      whileHover={reducedMotion ? {} : { scale: 1.05 }}
                      whileTap={reducedMotion ? {} : { scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Link to="/dashboard">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto">
                          Go to Dashboard
                        </Button>
                      </Link>
                    </motion.div>
                  </>
                ) : (
                  <>
                    <motion.div
                      whileHover={reducedMotion ? {} : { scale: 1.05 }}
                      whileTap={reducedMotion ? {} : { scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Link to="/auth">
                        <Button size="lg" className="w-full sm:w-auto">
                          Get Started Free
                          <GraduationCap className="ml-2 h-5 w-5" />
                        </Button>
                      </Link>
                    </motion.div>
                    <motion.div
                      whileHover={reducedMotion ? {} : { scale: 1.05 }}
                      whileTap={reducedMotion ? {} : { scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 400, damping: 17 }}
                    >
                      <Link to="/courses">
                        <Button size="lg" variant="outline" className="w-full sm:w-auto">
                          Explore Courses
                        </Button>
                      </Link>
                    </motion.div>
                  </>
                )}
              </motion.div>
            </motion.div>
          </div>
        </section>
      )}
    </motion.div>
  );
}

