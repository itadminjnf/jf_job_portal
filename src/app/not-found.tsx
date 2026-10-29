import React from 'react';
import Link from 'next/link';
import type { Metadata } from 'next';
import { Container } from '@/components/common/Container';

export const metadata: Metadata = {
  title: 'Page Not Found (404) | Jackson & Frank',
  description: 'The page or vacancy you are looking for is no longer available.',
  robots: {
    index: false,
    follow: false,
  },
};

export default function NotFound() {
  return (
    <div
      style={{
        minHeight: '70vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '80px 20px',
        textAlign: 'center',
      }}
    >
      <Container>
        <div style={{ maxWidth: '640px', margin: '0 auto' }}>
          <span
            style={{
              fontSize: '84px',
              fontWeight: 800,
              color: '#1E3A8A',
              display: 'block',
              lineHeight: 1,
              marginBottom: '16px',
            }}
          >
            404
          </span>
          <h1
            style={{
              fontSize: '28px',
              fontWeight: 700,
              color: '#0F172A',
              marginBottom: '14px',
            }}
          >
            Page or Vacancy Not Found
          </h1>
          <p
            style={{
              fontSize: '16px',
              color: '#64748B',
              lineHeight: 1.6,
              marginBottom: '32px',
            }}
          >
            The role or link you requested may have expired, been filled, or moved. Explore our latest international job openings or head back to the homepage.
          </p>

          <div
            style={{
              display: 'flex',
              gap: '16px',
              justifyContent: 'center',
              flexWrap: 'wrap',
            }}
          >
            <Link
              href="/vacancies"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#1E3A8A',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              Browse All Vacancies →
            </Link>
            <Link
              href="/"
              style={{
                display: 'inline-flex',
                alignItems: 'center',
                gap: '8px',
                padding: '12px 24px',
                backgroundColor: '#F1F5F9',
                color: '#1E293B',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '15px',
                textDecoration: 'none',
              }}
            >
              Return Home
            </Link>
          </div>
        </div>
      </Container>
    </div>
  );
}

