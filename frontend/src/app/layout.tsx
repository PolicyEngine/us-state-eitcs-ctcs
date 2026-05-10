import type { Metadata, Viewport } from 'next';
import './globals.css';

const SITE_URL = 'https://us-state-eitcs-ctcs.vercel.app';
const TITLE = 'State Tax Credits Impact | PolicyEngine';
const DESCRIPTION =
  'Explore how state-level Earned Income Tax Credits and Child Tax Credits reduce poverty across American communities. Interactive map and data powered by PolicyEngine microsimulation.';
const OG_TITLE = 'The Impact of State Tax Credits on American Families';

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: TITLE,
  description: DESCRIPTION,
  authors: [{ name: 'PolicyEngine' }],
  openGraph: {
    type: 'website',
    title: OG_TITLE,
    description:
      'Explore how state-level Earned Income Tax Credits and Child Tax Credits reduce poverty across communities. Interactive map by PolicyEngine.',
    siteName: 'PolicyEngine',
    images: [
      {
        url: '/social-preview.png',
        width: 1200,
        height: 630,
        alt: 'State tax credits impact dashboard',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: OG_TITLE,
    description:
      'Explore how state-level EITCs and CTCs reduce poverty across communities. Interactive map by PolicyEngine.',
    site: '@ThePolicyEngine',
    images: [
      {
        url: '/social-preview.png',
        alt: 'State tax credits impact dashboard',
      },
    ],
  },
  icons: {
    icon: `${process.env.NEXT_PUBLIC_BASE_PATH || ""}/favicon.svg`,
  },
};

export const viewport: Viewport = {
  themeColor: '#319795',
  width: 'device-width',
  initialScale: 1,
};

const jsonLd = {
  '@context': 'https://schema.org',
  '@type': 'WebApplication',
  name: 'State Tax Credits Impact Dashboard',
  description:
    'Interactive analysis of how state-level Earned Income Tax Credits and Child Tax Credits reduce poverty across American communities.',
  applicationCategory: 'DataVisualization',
  operatingSystem: 'Any',
  creator: {
    '@type': 'Organization',
    name: 'PolicyEngine',
    url: 'https://policyengine.org',
  },
  about: {
    '@type': 'Dataset',
    name: 'State EITC and CTC Impact Data',
    description:
      'Microsimulation estimates of poverty reduction from state-level Earned Income Tax Credits and Child Tax Credits.',
    temporalCoverage: '2025/2026',
    spatialCoverage: {
      '@type': 'Place',
      name: 'United States',
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
        <script
          type="application/ld+json"
          // The structured-data payload is a static JSON object built above.
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
      </head>
      <body>
        {children}
        <noscript>
          <div style={{ padding: 40, textAlign: 'center', fontFamily: 'sans-serif' }}>
            <h1>State Tax Credits Impact | PolicyEngine</h1>
            <p>
              This interactive dashboard requires JavaScript to run. Please
              enable JavaScript in your browser to explore how state-level
              Earned Income Tax Credits and Child Tax Credits reduce poverty
              across American communities.
            </p>
            <p>
              Learn more at <a href="https://policyengine.org">policyengine.org</a>.
            </p>
          </div>
        </noscript>
      </body>
    </html>
  );
}
