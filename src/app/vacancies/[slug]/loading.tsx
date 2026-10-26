import React from 'react';
import { Loader } from '@/components/common/Loader';
import { Container } from '@/components/common/Container';

export default function JobDetailsLoading() {
  return (
    <div style={{ minHeight: '60vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Container>
        <Loader
          variant="section"
          size="lg"
          color="primary"
          text="Loading job details..."
          subtext="Fetching vacancy information and requirements"
        />
      </Container>
    </div>
  );
}
