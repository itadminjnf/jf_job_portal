import React from 'react';
import { Loader } from '@/components/common/Loader';

export default function VacanciesLoading() {
  return (
    <Loader
      variant="section"
      size="lg"
      color="primary"
      text="Loading vacancies..."
      subtext="Fetching the latest career opportunities"
    />
  );
}
