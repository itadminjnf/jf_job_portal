import { CategoryItem, CategoryTab } from '@/types/common';

export const categoryTabs: CategoryTab[] = [
  'By Industry',
  'By Function',
  'By Location',
  'By Job Type',
];

export const categoriesByTab: Record<CategoryTab, CategoryItem[]> = {
  'By Industry': [
    { id: 'it-software', title: 'IT & Software', jobCount: '', icon: 'laptop' },
    { id: 'finance-banking', title: 'Finance & Banking', jobCount: '', icon: 'bank' },
    { id: 'engineering', title: 'Engineering', jobCount: '', icon: 'gear' },
    { id: 'healthcare', title: 'Healthcare', jobCount: '', icon: 'heart' },
    { id: 'sales-marketing', title: 'Sales & Marketing', jobCount: '', icon: 'chart' },
    { id: 'hr-recruitment', title: 'HR & Recruitment', jobCount: '', icon: 'users' },
    { id: 'legal-compliance', title: 'Legal & Compliance', jobCount: '', icon: 'scale' },
    { id: 'others', title: 'Others', jobCount: '', icon: 'grid' },
  ],
  'By Function': [
    { id: 'software-dev', title: 'Software Engineering', jobCount: '', icon: 'laptop' },
    { id: 'product-mgmt', title: 'Product & Design', jobCount: '', icon: 'grid' },
    { id: 'data-ai', title: 'Data Science & AI', jobCount: '', icon: 'chart' },
    { id: 'operations', title: 'Business Operations', jobCount: '', icon: 'gear' },
    { id: 'talent-hr', title: 'People & Talent', jobCount: '', icon: 'users' },
    { id: 'finance-ops', title: 'Finance & Accounting', jobCount: '', icon: 'bank' },
    { id: 'clinical-care', title: 'Clinical & Health', jobCount: '', icon: 'heart' },
    { id: 'consulting', title: 'Advisory & Strategy', jobCount: '', icon: 'scale' },
  ],
  'By Location': [
    { id: 'remote-global', title: 'Fully Remote', jobCount: '', icon: 'laptop' },
  ],
  'By Job Type': [
    { id: 'full-time', title: 'Full Time', jobCount: '', icon: 'briefcase' },
    { id: 'permanent', title: 'Permanent', jobCount: '', icon: 'scale' },
    { id: 'contract', title: 'Contract & Interim', jobCount: '', icon: 'gear' },
    { id: 'remote', title: 'Remote / Distributed', jobCount: '', icon: 'laptop' },
    { id: 'hybrid', title: 'Hybrid Work', jobCount: '', icon: 'building' },
    { id: 'part-time', title: 'Part Time', jobCount: '', icon: 'chart' },
    { id: 'executive', title: 'Executive Search', jobCount: '', icon: 'users' },
    { id: 'internships', title: 'Graduate & Trainee', jobCount: '', icon: 'heart' },
  ],
};
