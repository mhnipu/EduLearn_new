/**
 * Section Schema Definitions
 * 
 * Defines all available section types with their field schemas,
 * layout variants, validation rules, and default values.
 */

export interface FieldSchema {
  name: string;
  type: 'text' | 'textarea' | 'image' | 'button' | 'icon' | 'array' | 'boolean' | 'number';
  label: string;
  required?: boolean;
  default?: any;
  validation?: {
    min?: number;
    max?: number;
    pattern?: string;
  };
  itemSchema?: Record<string, string>; // For array fields
  placeholder?: string;
}

export interface SectionSchema {
  section_type: string;
  display_name: string;
  description: string;
  icon?: string;
  fields: FieldSchema[];
  layout_variants: string[];
  defaultContent: Record<string, any>;
}

export const SECTION_SCHEMAS: Record<string, SectionSchema> = {
  hero: {
    section_type: 'hero',
    display_name: 'Hero Section',
    description: 'Main landing section with title, subtitle, and CTAs',
    icon: 'Zap',
    layout_variants: ['hero-1', 'hero-2', 'hero-3'],
    fields: [
      {
        name: 'badge',
        type: 'text',
        label: 'Badge Text',
        placeholder: 'Modern E-Learning Platform',
      },
      {
        name: 'title_line_1',
        type: 'text',
        label: 'Title Line 1',
        required: true,
        placeholder: 'Learn Anything,',
      },
      {
        name: 'title_line_2',
        type: 'text',
        label: 'Title Line 2',
        placeholder: 'Anytime, Anywhere',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Subtitle',
        placeholder: 'Access high-quality courses...',
      },
      {
        name: 'cta_primary',
        type: 'button',
        label: 'Primary CTA',
      },
      {
        name: 'cta_secondary',
        type: 'button',
        label: 'Secondary CTA',
      },
      {
        name: 'background_image',
        type: 'image',
        label: 'Background Image',
      },
    ],
    defaultContent: {
      badge: 'Modern E-Learning Platform',
      title_line_1: 'Learn Anything,',
      title_line_2: 'Anytime, Anywhere',
      subtitle: 'Access high-quality courses, watch engaging video lessons, and download comprehensive study materials.',
      cta_primary: { text: 'Get Started Free', link: '/auth' },
      cta_secondary: { text: 'Browse Courses', link: '/courses' },
    },
  },

  features: {
    section_type: 'features',
    display_name: 'Features Section',
    description: 'Showcase key features with icons and descriptions',
    icon: 'Grid',
    layout_variants: ['features-grid', 'features-list', 'features-icons'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
        placeholder: 'Why Choose EduLearn?',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
        placeholder: 'Everything you need to succeed...',
      },
      {
        name: 'features',
        type: 'array',
        label: 'Features',
        itemSchema: {
          icon: 'text',
          title: 'text',
          description: 'textarea',
        },
      },
    ],
    defaultContent: {
      title: 'Why Choose EduLearn?',
      subtitle: 'Everything you need to succeed in your learning journey',
      features: [
        { icon: 'Video', title: 'Video Lessons', description: 'Watch high-quality video tutorials' },
        { icon: 'FileText', title: 'Study Materials', description: 'Download comprehensive PDF resources' },
        { icon: 'Users', title: 'Expert Teachers', description: 'Learn from experienced educators' },
      ],
    },
  },

  services: {
    section_type: 'services',
    display_name: 'Services Section',
    description: 'Display services with icons, images, and descriptions',
    icon: 'Briefcase',
    layout_variants: ['services-grid', 'services-tabs', 'services-accordion'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
      },
      {
        name: 'services',
        type: 'array',
        label: 'Services',
        itemSchema: {
          icon: 'text',
          title: 'text',
          description: 'textarea',
          image: 'image',
        },
      },
    ],
    defaultContent: {
      title: 'Our Services',
      subtitle: 'Comprehensive learning solutions for everyone',
      services: [],
    },
  },

  stats: {
    section_type: 'stats',
    display_name: 'Statistics Section',
    description: 'Display key statistics and metrics',
    icon: 'BarChart',
    layout_variants: ['stats-4col', 'stats-3col', 'stats-carousel'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
      },
      {
        name: 'stats',
        type: 'array',
        label: 'Statistics',
        itemSchema: {
          value: 'text',
          label: 'text',
          icon: 'text',
        },
      },
    ],
    defaultContent: {
      title: 'Our Impact',
      subtitle: 'Numbers that speak for themselves',
      stats: [
        { value: '10K+', label: 'Students', icon: 'Users' },
        { value: '500+', label: 'Courses', icon: 'BookOpen' },
        { value: '100+', label: 'Teachers', icon: 'GraduationCap' },
      ],
    },
  },

  testimonials: {
    section_type: 'testimonials',
    display_name: 'Testimonials Section',
    description: 'Showcase customer testimonials and reviews',
    icon: 'MessageSquare',
    layout_variants: ['testimonials-grid', 'testimonials-carousel', 'testimonials-single'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
      },
      {
        name: 'testimonials',
        type: 'array',
        label: 'Testimonials',
        itemSchema: {
          name: 'text',
          role: 'text',
          content: 'textarea',
          avatar: 'image',
          rating: 'number',
        },
      },
    ],
    defaultContent: {
      title: 'What Our Students Say',
      subtitle: 'Hear from our community',
      testimonials: [],
    },
  },

  cta: {
    section_type: 'cta',
    display_name: 'Call to Action',
    description: 'Prominent call-to-action section',
    icon: 'ArrowRight',
    layout_variants: ['cta-centered', 'cta-split', 'cta-banner'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Title',
        required: true,
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Subtitle',
      },
      {
        name: 'cta_text',
        type: 'text',
        label: 'CTA Text',
        required: true,
      },
      {
        name: 'cta_link',
        type: 'text',
        label: 'CTA Link',
        required: true,
      },
      {
        name: 'show_when_logged_in',
        type: 'boolean',
        label: 'Show When Logged In',
        default: false,
      },
    ],
    defaultContent: {
      title: 'Ready to Start Learning?',
      subtitle: 'Join thousands of students already learning on our platform.',
      cta_text: 'Get Started Free',
      cta_link: '/auth',
      show_when_logged_in: false,
    },
  },

  pricing: {
    section_type: 'pricing',
    display_name: 'Pricing Section',
    description: 'Display pricing plans and packages',
    icon: 'DollarSign',
    layout_variants: ['pricing-3col', 'pricing-4col', 'pricing-table'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
      },
      {
        name: 'plans',
        type: 'array',
        label: 'Pricing Plans',
        itemSchema: {
          name: 'text',
          price: 'text',
          period: 'text',
          features: 'array',
          cta_text: 'text',
          cta_link: 'text',
        },
      },
    ],
    defaultContent: {
      title: 'Pricing Plans',
      subtitle: 'Choose the plan that works for you',
      plans: [],
    },
  },

  faq: {
    section_type: 'faq',
    display_name: 'FAQ Section',
    description: 'Frequently asked questions with expandable answers',
    icon: 'HelpCircle',
    layout_variants: ['faq-accordion', 'faq-grid', 'faq-tabs'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
      },
      {
        name: 'faqs',
        type: 'array',
        label: 'FAQs',
        itemSchema: {
          question: 'text',
          answer: 'textarea',
        },
      },
    ],
    defaultContent: {
      title: 'Frequently Asked Questions',
      subtitle: 'Find answers to common questions',
      faqs: [],
    },
  },

  timeline: {
    section_type: 'timeline',
    display_name: 'Timeline Section',
    description: 'Display events or milestones in chronological order',
    icon: 'Clock',
    layout_variants: ['timeline-vertical', 'timeline-horizontal', 'timeline-alternating'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
      },
      {
        name: 'events',
        type: 'array',
        label: 'Timeline Events',
        itemSchema: {
          date: 'text',
          title: 'text',
          description: 'textarea',
          icon: 'text',
        },
      },
    ],
    defaultContent: {
      title: 'Our Journey',
      subtitle: 'Key milestones and achievements',
      events: [],
    },
  },

  gallery: {
    section_type: 'gallery',
    display_name: 'Gallery Section',
    description: 'Image gallery with various layouts',
    icon: 'Image',
    layout_variants: ['gallery-grid', 'gallery-masonry', 'gallery-carousel'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
      },
      {
        name: 'images',
        type: 'array',
        label: 'Gallery Images',
        itemSchema: {
          url: 'image',
          caption: 'text',
          alt: 'text',
        },
      },
    ],
    defaultContent: {
      title: 'Gallery',
      subtitle: 'See our platform in action',
      images: [],
    },
  },

  blog: {
    section_type: 'blog',
    display_name: 'Blog Preview',
    description: 'Preview of blog posts or articles',
    icon: 'FileText',
    layout_variants: ['blog-grid', 'blog-list', 'blog-featured'],
    fields: [
      {
        name: 'title',
        type: 'text',
        label: 'Section Title',
      },
      {
        name: 'subtitle',
        type: 'textarea',
        label: 'Section Subtitle',
      },
      {
        name: 'posts',
        type: 'array',
        label: 'Blog Posts',
        itemSchema: {
          title: 'text',
          excerpt: 'textarea',
          image: 'image',
          link: 'text',
          date: 'text',
        },
      },
    ],
    defaultContent: {
      title: 'Latest Blog Posts',
      subtitle: 'Stay updated with our latest articles',
      posts: [],
    },
  },

  custom: {
    section_type: 'custom',
    display_name: 'Custom Section',
    description: 'Fully customizable HTML content',
    icon: 'Code',
    layout_variants: ['custom-html'],
    fields: [
      {
        name: 'html',
        type: 'textarea',
        label: 'HTML Content',
        placeholder: '<div>Your custom HTML here</div>',
      },
      {
        name: 'css',
        type: 'textarea',
        label: 'Custom CSS',
        placeholder: '/* Your custom CSS here */',
      },
    ],
    defaultContent: {
      html: '<div class="text-center"><h2>Custom Section</h2><p>Add your custom content here</p></div>',
      css: '',
    },
  },
};

/**
 * Get schema for a section type
 */
export function getSectionSchema(sectionType: string): SectionSchema | null {
  return SECTION_SCHEMAS[sectionType] || null;
}

/**
 * Get all available section types
 */
export function getAvailableSectionTypes(): string[] {
  return Object.keys(SECTION_SCHEMAS);
}

/**
 * Get layout variants for a section type
 */
export function getLayoutVariants(sectionType: string): string[] {
  const schema = getSectionSchema(sectionType);
  return schema?.layout_variants || [];
}

/**
 * Get default content for a section type
 */
export function getDefaultContent(sectionType: string): Record<string, any> {
  const schema = getSectionSchema(sectionType);
  return schema?.defaultContent || {};
}
