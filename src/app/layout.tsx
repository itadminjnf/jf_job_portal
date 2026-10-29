import type { Metadata } from 'next';
import { Inter, IBM_Plex_Serif, Caveat } from 'next/font/google';
import { Header } from '@/components/layout/Header';
import { Footer } from '@/components/layout/Footer';
import { JobAlertModalProvider } from '@/context/JobAlertModalContext';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  variable: '--font-inter',
  display: 'swap',
});

const ibmPlexSerif = IBM_Plex_Serif({
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  variable: '--font-ibm-plex-serif',
  display: 'swap',
});

const caveat = Caveat({
  subsets: ['latin'],
  variable: '--font-caveat',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL('https://jobs.jacksonandfrank.com/'),
  title: {
    default: 'Jackson & Frank | Global Jobs & Career Opportunities',
    template: '%s | Jackson & Frank',
  },
  description: 'Explore global job opportunities, connect with leading companies and build your career without borders with Jackson & Frank.',
  keywords: ['Global jobs', 'International recruitment', 'Tech careers Europe', 'Jackson & Frank', 'Netherlands jobs', 'Relocation jobs', 'IT recruitment'],
  authors: [{ name: 'Jackson & Frank', url: 'https://jobs.jacksonandfrank.com/' }],
  creator: 'Jackson & Frank',
  publisher: 'Jackson & Frank',
  alternates: {
    canonical: '/',
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      'max-video-preview': -1,
      'max-image-preview': 'large',
      'max-snippet': -1,
    },
  },
  openGraph: {
    title: 'Jackson & Frank | Global Jobs & Career Opportunities',
    description: 'Explore global job opportunities, connect with leading companies and build your career without borders with Jackson & Frank.',
    url: 'https://jacksonfrank.com',
    siteName: 'Jackson & Frank',
    locale: 'en_US',
    type: 'website',
    images: [
      {
        url: '/images/hero/hero-woman.png',
        width: 1200,
        height: 630,
        alt: 'Jackson & Frank Global Careers',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: 'Jackson & Frank | Global Jobs & Career Opportunities',
    description: 'Explore global job opportunities, connect with leading companies and build your career without borders.',
    images: ['/images/hero/hero-woman.png'],
  },
};

const orgSchema = {
  '@context': 'https://schema.org',
  '@graph': [
    {
      '@type': 'Organization',
      '@id': 'https://jacksonfrank.com/#organization',
      name: 'Jackson & Frank',
      url: 'https://jacksonfrank.com',
      logo: {
        '@type': 'ImageObject',
        url: 'https://jacksonfrank.com/images/logos/logo-dark.svg',
      },
      sameAs: [
        'https://linkedin.com/company/jackson-frank',
        'https://jacksonandfrank.com/',
        'https://www.youtube.com/@JacksonAndFrank',
      ],
      contactPoint: {
        '@type': 'ContactPoint',
        telephone: '+31 (0)20 890 4500',
        contactType: 'recruitment',
        email: 'info@jacksonfrank.com',
        areaServed: 'Worldwide',
      },
    },
    {
      '@type': 'WebSite',
      '@id': 'https://jacksonfrank.com/#website',
      url: 'https://jacksonfrank.com',
      name: 'Jackson & Frank Career Portal',
      publisher: {
        '@id': 'https://jacksonfrank.com/#organization',
      },
      potentialAction: {
        '@type': 'SearchAction',
        target: 'https://jacksonfrank.com/vacancies?q={search_term_string}',
        'query-input': 'required name=search_term_string',
      },
    },
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${ibmPlexSerif.variable} ${caveat.variable}`}>
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(orgSchema) }}
        />
      </head>
      <body>
        <JobAlertModalProvider>
          <Header />
          <main>{children}</main>
          <Footer />
        </JobAlertModalProvider>
      </body>
    </html>
  );
}
