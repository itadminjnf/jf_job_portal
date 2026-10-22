import { CategoryItem, CategoryTab } from '@/types/common';

export const categoryTabs: CategoryTab[] = [
  'By Industry',
  'By Function',
  'By Location',
  'By Job Type',
];

export const categoriesByTab: Record<CategoryTab, CategoryItem[]> = {
  'By Industry': [
    { id: 'it-software', title: 'IT & Software', jobCount: '1,200+ jobs', icon: 'laptop' },
    { id: 'finance-banking', title: 'Finance & Banking', jobCount: '450+ jobs', icon: 'bank' },
    { id: 'engineering', title: 'Engineering', jobCount: '380+ jobs', icon: 'gear' },
    { id: 'healthcare', title: 'Healthcare', jobCount: '210+ jobs', icon: 'heart' },
    { id: 'sales-marketing', title: 'Sales & Marketing', jobCount: '320+ jobs', icon: 'chart' },
    { id: 'hr-recruitment', title: 'HR & Recruitment', jobCount: '190+ jobs', icon: 'users' },
    { id: 'legal-compliance', title: 'Legal & Compliance', jobCount: '120+ jobs', icon: 'scale' },
    { id: 'others', title: 'Others', jobCount: '300+ jobs', icon: 'grid' },
  ],
  'By Function': [
    { id: 'software-dev', title: 'Software Engineering', jobCount: '890+ jobs', icon: 'laptop' },
    { id: 'product-mgmt', title: 'Product & Design', jobCount: '310+ jobs', icon: 'grid' },
    { id: 'data-ai', title: 'Data Science & AI', jobCount: '420+ jobs', icon: 'chart' },
    { id: 'operations', title: 'Business Operations', jobCount: '250+ jobs', icon: 'gear' },
    { id: 'talent-hr', title: 'People & Talent', jobCount: '180+ jobs', icon: 'users' },
    { id: 'finance-ops', title: 'Finance & Accounting', jobCount: '390+ jobs', icon: 'bank' },
    { id: 'clinical-care', title: 'Clinical & Health', jobCount: '160+ jobs', icon: 'heart' },
    { id: 'consulting', title: 'Advisory & Strategy', jobCount: '220+ jobs', icon: 'scale' },
  ],
  'By Location': [
    { id: 'remote-global', title: 'Fully Remote', jobCount: '650+ jobs', icon: 'laptop' },
  ],
  'By Job Type': [
    { id: 'full-time', title: 'Full Time', jobCount: '3,200+ jobs', icon: 'briefcase' },
    { id: 'permanent', title: 'Permanent', jobCount: '1,850+ jobs', icon: 'scale' },
    { id: 'contract', title: 'Contract & Interim', jobCount: '620+ jobs', icon: 'gear' },
    { id: 'remote', title: 'Remote / Distributed', jobCount: '750+ jobs', icon: 'laptop' },
    { id: 'hybrid', title: 'Hybrid Work', jobCount: '1,100+ jobs', icon: 'building' },
    { id: 'part-time', title: 'Part Time', jobCount: '140+ jobs', icon: 'chart' },
    { id: 'executive', title: 'Executive Search', jobCount: '90+ jobs', icon: 'users' },
    { id: 'internships', title: 'Graduate & Trainee', jobCount: '210+ jobs', icon: 'heart' },
  ],
};
