import { Job } from '@/types/job';
import { FilterChip, StatisticItem } from '@/types/common';

export const featuredJobs: Job[] = []

export const filterChips: FilterChip[] = [
  { id: 'remote', label: 'Remote', type: 'workstyle' },
  { id: 'contract', label: 'Contract', type: 'type' },
  { id: 'permanent', label: 'Permanent', type: 'type' },
  { id: 'it-software', label: 'IT & Software', type: 'industry' },
  { id: 'finance', label: 'Finance', type: 'industry' },
  { id: 'hr', label: 'HR', type: 'industry' },
  { id: 'marketing', label: 'Marketing', type: 'industry' },
];

export const portalStatistics: StatisticItem[] = [
  {
    id: 'stat-jobs',
    value: '5,000+',
    label: 'Jobs Worldwide',
    icon: 'briefcase',
  },
  {
    id: 'stat-companies',
    value: '500+',
    label: 'Trusted Companies',
    icon: 'building',
  },
  {
    id: 'stat-countries',
    value: '50+',
    label: 'Countries',
    icon: 'globe',
  },
  {
    id: 'stat-satisfaction',
    value: '98%',
    label: 'Client Satisfaction',
    icon: 'smile',
  },
];
