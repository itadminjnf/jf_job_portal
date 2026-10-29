import type { MetadataRoute } from 'next';
import { getAllJobs } from '@/lib/api';
import { blogPosts } from '@/data/blogs';
import { newsArticles } from '@/data/news';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://jacksonfrank.com';

  // 1. Core Static Pages
  const staticRoutes: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}`,
      lastModified: new Date(),
      changeFrequency: 'daily',
      priority: 1.0,
    },
    {
      url: `${baseUrl}/vacancies`,
      lastModified: new Date(),
      changeFrequency: 'hourly',
      priority: 0.9,
    },
    {
      url: `${baseUrl}/job-alert`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
    {
      url: `${baseUrl}/news`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 0.8,
    },
  ];

  // 2. Dynamic Vacancies from API
  let jobRoutes: MetadataRoute.Sitemap = [];
  try {
    const jobs = await getAllJobs({ itemsPerPage: 100 });
    jobRoutes = jobs.map((job) => ({
      url: `${baseUrl}/vacancies/${job.slug || job.id}`,
      lastModified: job.dateTimestamp ? new Date(job.dateTimestamp) : new Date(),
      changeFrequency: 'daily' as const,
      priority: 0.8,
    }));
  } catch (error) {
    console.error('[Sitemap] Could not fetch live jobs for sitemap:', error);
  }

  // 3. Blog Posts
  const blogRoutes: MetadataRoute.Sitemap = blogPosts.map((post) => ({
    url: `${baseUrl}/blog/${post.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  // 4. News Articles
  const newsRoutes: MetadataRoute.Sitemap = newsArticles.map((article) => ({
    url: `${baseUrl}/news/${article.slug}`,
    lastModified: new Date(),
    changeFrequency: 'monthly' as const,
    priority: 0.6,
  }));

  return [...staticRoutes, ...jobRoutes, ...blogRoutes, ...newsRoutes];
}
