import React from 'react';
import { Loader } from '@/components/common/Loader';

export default function RootLoading() {
  return (
    <div style={{ minHeight: '50vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
      <Loader
        variant="section"
        size="lg"
        color="primary"
        text="Loading..."
      />
    </div>
  );
}
