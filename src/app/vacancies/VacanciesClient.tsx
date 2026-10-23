'use client';

import React, { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Container } from '@/components/common/Container';
import { JobSearch } from '@/components/home/JobSearch';
import { PopularFilters } from '@/components/home/PopularFilters';
import { JobGrid } from '@/components/jobs/JobGrid';
import { JobFilters } from '@/components/jobs/JobFilters';
import { Job } from '@/types/job';
import styles from './vacancies.module.css';

interface VacanciesClientProps {
  initialJobs: Job[];
}

export function VacanciesClient({ initialJobs }: VacanciesClientProps) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const queryQ = searchParams.get('q') || '';
  const queryLoc = searchParams.get('location') || '';
  const queryType = searchParams.get('type') || '';
  const queryFilter = searchParams.get('filter') || '';

  const [searchTerm, setSearchTerm] = useState(queryQ);
  const [selectedLocation, setSelectedLocation] = useState(queryLoc);
  const [selectedType, setSelectedType] = useState(queryType);
  const [activeChip, setActiveChip] = useState(queryFilter);
  const [currentPage, setCurrentPage] = useState(1);

  const ITEMS_PER_PAGE = 9;

  useEffect(() => {
    if (queryQ) setSearchTerm(queryQ);
    if (queryLoc) setSelectedLocation(queryLoc);
    if (queryType) setSelectedType(queryType);
    if (queryFilter) setActiveChip(queryFilter);
  }, [queryQ, queryLoc, queryType, queryFilter]);

  // Reset page to 1 whenever any filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, selectedLocation, selectedType, activeChip]);

  const handleSearch = ({ keyword, location, jobType }: { keyword: string; location: string; jobType: string }) => {
    const formattedType = jobType === 'All types' ? '' : jobType;
    setSearchTerm(keyword);
    setSelectedLocation(location);
    setSelectedType(formattedType);

    const params = new URLSearchParams();
    if (keyword) params.set('q', keyword);
    if (location) params.set('location', location);
    if (formattedType) params.set('type', formattedType);
    if (activeChip) params.set('filter', activeChip);
    router.replace(`/vacancies${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  const handleChipSelect = (chipId: string) => {
    setActiveChip(chipId);
    const params = new URLSearchParams();
    if (searchTerm) params.set('q', searchTerm);
    if (selectedLocation) params.set('location', selectedLocation);
    if (selectedType) params.set('type', selectedType);
    if (chipId) params.set('filter', chipId);
    router.replace(`/vacancies${params.toString() ? `?${params.toString()}` : ''}`, { scroll: false });
  };

  // Filter the live jobs using all criteria
  const filteredJobs = useMemo(() => {
    return initialJobs.filter((job) => {
      // 1. Location match
      const matchLoc =
        !selectedLocation ||
        job.country.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        job.city.toLowerCase().includes(selectedLocation.toLowerCase()) ||
        job.location.toLowerCase().includes(selectedLocation.toLowerCase());

      // 2. Type match
      const matchType =
        !selectedType ||
        job.type.toLowerCase().includes(selectedType.toLowerCase());

      // 3. Search Keyword match (title, company, skills, description)
      const q = searchTerm.toLowerCase();
      const matchSearch =
        !searchTerm ||
        job.title.toLowerCase().includes(q) ||
        job.company.toLowerCase().includes(q) ||
        (job.description && job.description.toLowerCase().includes(q)) ||
        (Array.isArray(job.skills) && job.skills.some((s) => s.toLowerCase().includes(q)));

      // 4. Popular Chip filter match
      let matchChip = true;
      if (activeChip) {
        const c = activeChip.toLowerCase();
        if (c === 'remote') {
          matchChip = job.type.toLowerCase().includes('remote') || job.location.toLowerCase().includes('remote');
        } else if (c === 'contract') {
          matchChip = job.type.toLowerCase().includes('contract');
        } else if (c === 'permanent') {
          matchChip = job.type.toLowerCase().includes('permanent') || job.type.toLowerCase().includes('full');
        } else if (['netherlands', 'india', 'poland', 'germany'].includes(c)) {
          matchChip = job.country.toLowerCase().includes(c) || job.location.toLowerCase().includes(c);
        } else if (c === 'it-software') {
          matchChip =
            (job.industry?.toLowerCase().includes('software') ||
              job.industry?.toLowerCase().includes('it') ||
              job.skills?.some((s) => /tech|soft|dev|code|cloud|data|agile|scrum/i.test(s))) ?? false;
        } else if (c === 'finance') {
          matchChip =
            (job.industry?.toLowerCase().includes('finance') ||
              job.industry?.toLowerCase().includes('banking') ||
              job.skills?.some((s) => /finance|risk|audit|bank/i.test(s))) ?? false;
        } else if (c === 'hr') {
          matchChip =
            (job.industry?.toLowerCase().includes('hr') ||
              job.industry?.toLowerCase().includes('recruitment') ||
              job.skills?.some((s) => /talent|hr|recruiting/i.test(s))) ?? false;
        } else if (c === 'marketing') {
          matchChip =
            (job.industry?.toLowerCase().includes('marketing') ||
              job.skills?.some((s) => /marketing|seo|growth|content/i.test(s))) ?? false;
        }
      }

      return matchLoc && matchType && matchSearch && matchChip;
    });
  }, [initialJobs, selectedLocation, selectedType, searchTerm, activeChip]);

  // Pagination calculation: 9 items per page
  const totalPages = Math.ceil(filteredJobs.length / ITEMS_PER_PAGE);
  const startIndex = (currentPage - 1) * ITEMS_PER_PAGE;
  const paginatedJobs = filteredJobs.slice(startIndex, startIndex + ITEMS_PER_PAGE);

  const handlePageChange = (page: number) => {
    if (page < 1 || page > totalPages) return;
    setCurrentPage(page);
    window.scrollTo({ top: 380, behavior: 'smooth' });
  };

  // Generate numbered pagination items
  const getPageNumbers = () => {
    if (totalPages <= 6) {
      return Array.from({ length: totalPages }, (_, i) => i + 1);
    }
    if (currentPage <= 3) {
      return [1, 2, 3, 4, '...', totalPages];
    }
    if (currentPage >= totalPages - 2) {
      return [1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages];
    }
    return [1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages];
  };

  return (
    <div className={styles.page}>
      <div className={styles.hero}>
        <div className={styles.mapBackground} aria-hidden="true" />
        <Container>
          <div className={styles.heroInner}>
            <span ></span>
            <h1 className={styles.title}>Explore International Vacancies</h1>
            <p className={styles.subtitle}>
              Browse verified job opportunities with premier technology and corporate leaders across Europe, Asia, and the Americas.
            </p>
          </div>
        </Container>
      </div>

      {/* Top Search Bar & Popular Filter Chips */}
      <JobSearch
        initialKeyword={searchTerm}
        initialLocation={selectedLocation}
        initialJobType={selectedType || 'All types'}
        onSearch={handleSearch}
        targetPath="/vacancies"
      />

      <PopularFilters
        activeFilter={activeChip}
        onSelectFilter={handleChipSelect}
        onClear={() => handleChipSelect('')}
        targetPath="/vacancies"
      />

      <section className={styles.contentSection}>
        <Container>
          <div className={styles.layout}>
            {/* Sidebar Filters */}
            <aside>
              <JobFilters
                selectedLocation={selectedLocation}
                onLocationChange={(loc) => {
                  setSelectedLocation(loc);
                  handleSearch({ keyword: searchTerm, location: loc, jobType: selectedType });
                }}
                selectedType={selectedType}
                onTypeChange={(t) => {
                  setSelectedType(t);
                  handleSearch({ keyword: searchTerm, location: selectedLocation, jobType: t });
                }}
                onClear={() => {
                  setSelectedLocation('');
                  setSelectedType('');
                  setSearchTerm('');
                  setActiveChip('');
                  router.replace('/vacancies', { scroll: false });
                }}
              />
            </aside>

            {/* Main Job Listing */}
            <main className={styles.mainContent}>
              <div className={styles.topBar}>
                <span className={styles.resultsCount}>
                  {filteredJobs.length > 0 ? (
                    <>
                      Showing {startIndex + 1}–{Math.min(startIndex + ITEMS_PER_PAGE, filteredJobs.length)} of {filteredJobs.length} active vacancies
                    </>
                  ) : (
                    'No active vacancies found'
                  )}
                </span>
                {(searchTerm || selectedLocation || selectedType || activeChip) && (
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedLocation('');
                      setSelectedType('');
                      setSearchTerm('');
                      setActiveChip('');
                      router.replace('/vacancies', { scroll: false });
                    }}
                    className={styles.clearBtn}
                  >
                    Clear all filters
                  </button>
                )}
              </div>

              {/* Paginated Job Grid (9 items per page) */}
              <JobGrid jobs={paginatedJobs} />

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className={styles.pagination} aria-label="Pagination Navigation">
                  {/* Previous Button */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage - 1)}
                    disabled={currentPage === 1}
                    className={styles.pageBtn}
                    aria-label="Previous Page"
                  >
                    ‹ Prev
                  </button>

                  {/* Page Numbers */}
                  {getPageNumbers().map((num, idx) => {
                    if (num === '...') {
                      return (
                        <span key={`ellipsis-${idx}`} className={styles.pageEllipsis}>
                          …
                        </span>
                      );
                    }
                    const pageNum = num as number;
                    return (
                      <button
                        key={pageNum}
                        type="button"
                        onClick={() => handlePageChange(pageNum)}
                        className={`${styles.pageBtn} ${currentPage === pageNum ? styles.pageBtnActive : ''}`}
                        aria-current={currentPage === pageNum ? 'page' : undefined}
                      >
                        {pageNum}
                      </button>
                    );
                  })}

                  {/* Next Button */}
                  <button
                    type="button"
                    onClick={() => handlePageChange(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    className={styles.pageBtn}
                    aria-label="Next Page"
                  >
                    Next ›
                  </button>
                </div>
              )}
            </main>
          </div>
        </Container>
      </section>
    </div>
  );
}
