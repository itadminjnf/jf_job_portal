export type EmploymentType = 'Full Time' | 'Permanent' | 'Contract' | 'Part Time' | 'Remote';

export interface Consultant {
  name: string;
  title?: string;
  email?: string;
  phone?: string;
  avatar?: string;
}

export interface Job {
  id: string;
  slug: string;
  title: string;
  company: string;
  companyLogo: string;
  location: string;
  country: string;
  city: string;
  type: EmploymentType;
  experience: string;
  skills: string[];
  postedTime: string;
  dateTimestamp?: number;
  salary?: string;
  description?: string;
  responsibilities?: string[];
  requirements?: string[];
  industry?: string;
  isFeatured?: boolean;

  // Rich OTYS Detailed Fields
  overviewHtml?: string;
  jobDescriptionHtml?: string;
  requirementsHtml?: string;
  companyProfileHtml?: string;
  benefitsHtml?: string;
  role?: string;
  education?: string;
  language?: string;
  hoursPerWeek?: string;
  region?: string;
  branche?: string;
  customApplyUrl?: string;
  consultant?: Consultant;
}

export interface JobSearchParams {
  keyword?: string;
  location?: string;
  jobType?: string;
}
