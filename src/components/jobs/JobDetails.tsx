'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { useJobAlertModal } from '@/context/JobAlertModalContext';
import { Job } from '@/types/job';
import { cleanRichHtml, translateDutchToEnglish } from '@/lib/utils';
import styles from './JobDetails.module.css';

interface JobDetailsProps {
  job: Job;
  similarJobs?: Job[];
}

/**
 * Expandable Content Component
 * Truncates long text or lists with a graceful gradient fade and "Show more / Show less" toggle
 */
function ExpandableContent({
  children,
  maxHeight = 260,
}: {
  children: React.ReactNode;
  maxHeight?: number;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isOverflowing, setIsOverflowing] = useState(false);
  const contentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = contentRef.current;
    if (el) {
      if (el.scrollHeight > maxHeight + 30) {
        setIsOverflowing(true);
      } else {
        setIsOverflowing(false);
      }
    }
  }, [children, maxHeight]);

  return (
    <div className={styles.expandableWrapper}>
      <div
        ref={contentRef}
        className={`${styles.expandableContent} ${!expanded && isOverflowing ? styles.isCollapsed : ''}`}
        style={{
          maxHeight: expanded || !isOverflowing ? 'none' : `${maxHeight}px`,
        }}
      >
        {children}
      </div>

      {isOverflowing && (
        <div className={styles.showMoreContainer}>
          <button
            type="button"
            onClick={() => setExpanded(!expanded)}
            className={styles.showMoreToggle}
            aria-expanded={expanded}
          >
            <span>{expanded ? 'Show less' : 'Show more'}</span>
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              className={`${styles.chevronIcon} ${expanded ? styles.chevronRotated : ''}`}
              aria-hidden="true"
            >
              <polyline points="6 9 12 15 18 9"></polyline>
            </svg>
          </button>
        </div>
      )}
    </div>
  );
}

export function JobDetails({ job, similarJobs = [] }: JobDetailsProps) {
  const { openJobAlertModal } = useJobAlertModal();
  const [saved, setSaved] = useState(false);
  const [copied, setCopied] = useState(false);

  // Form State
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [cvFile, setCvFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [formStatus, setFormStatus] = useState<'idle' | 'submitting' | 'success' | 'error'>('idle');
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Clean HTML from OTYS
  const cleanedOverview = cleanRichHtml(job.overviewHtml);
  const cleanedJobDesc = cleanRichHtml(job.jobDescriptionHtml);
  const cleanedRequirements = cleanRichHtml(job.requirementsHtml);
  const cleanedBenefits = cleanRichHtml(job.benefitsHtml);

  const displayType = translateDutchToEnglish(job.type || 'Full Time');
  const displayHours = translateDutchToEnglish(job.hoursPerWeek || '');
  const displayLanguage = translateDutchToEnglish(job.language || '');
  const displayWorkModel = job.region ? translateDutchToEnglish(job.region) : 'Hybrid';

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const scrollToApply = () => {
    const el = document.getElementById('application-form');
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setCvFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      setCvFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitApplication = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');

    if (!firstName.trim()) {
      setFormError('Please enter your first name.');
      return;
    }

    if (!lastName.trim()) {
      setFormError('Please enter your last name.');
      return;
    }

    const cleanPhone = phone.trim();
    if (!cleanPhone) {
      setFormError('Please enter your phone number.');
      return;
    }
    const digits = cleanPhone.replace(/\D/g, '');
    if (digits.length < 8 || digits.length > 15) {
      setFormError('Please enter a valid phone number (between 8 and 15 digits, e.g. +31...).');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!cvFile) {
      setFormError('CV is mandatory. Please upload your CV (.pdf, .doc, .docx).');
      return;
    }

    if (!agreedToTerms) {
      setFormError('Please agree with the privacy conditions before submitting.');
      return;
    }

    try {
      setFormStatus('submitting');

      // 1. Upload CV to /api/files
      const fileFormData = new FormData();
      fileFormData.append('file', cvFile);

      const fileResponse = await fetch('/api/files', {
        method: 'POST',
        body: fileFormData,
      });

      const fileData = await fileResponse.json();
      console.log('[Files API Response]:', fileData);

      if (!fileResponse.ok) {
        throw new Error(fileData.error || 'Failed to upload CV file. Please try again.');
      }

      const fileId = Array.isArray(fileData) ? fileData[0]?.id : fileData.id;
      const owsFileUid = fileData.owsFileUid || null;
      if (!fileId && !owsFileUid) {
        throw new Error('CV upload did not return a valid file ID.');
      }

      // 2. Submit Application to /api/vacancy_application/{vacancyId}
      const response = await fetch(`/api/vacancy_application/${encodeURIComponent(String(job.id))}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: cleanPhone,
          owsFileUid: owsFileUid,
          answers: {
            q1356387: firstName.trim(),
            q1356388: lastName.trim(),
            q1356389: email.trim(),
            q1356390: cleanPhone,
            q1356391: String(fileId || owsFileUid),
            q1356392: ['1'],
            'q-666': ['1'],
          },
          metaData: {
            referer: typeof window !== 'undefined' ? window.location.href : null,
          },
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to submit application. Please try again.');
      }

      // 3. Success state aur form clear karna
      setFormStatus('success');
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setCvFile(null);
      setAgreedToTerms(false);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to submit application';
      setFormError(message);
      setFormStatus('error');
    }
  };

  return (
    <div className={styles.container}>
      {/* 1. Breadcrumbs + Top Action Buttons */}
      <div className={styles.topBar}>
        <nav className={styles.breadcrumbs} aria-label="Breadcrumb">
          <Link href="/" className={styles.breadcrumbLink}>Home</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <Link href="/vacancies" className={styles.breadcrumbLink}>Vacancies</Link>
          <span className={styles.breadcrumbSeparator}>/</span>
          <span className={styles.breadcrumbCurrent}>{job.title}</span>
        </nav>

        <div className={styles.topActions}>
          <button
            type="button"
            onClick={handleShare}
            className={styles.topActionBtn}
            title="Share Vacancy"
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="18" cy="5" r="3"></circle>
              <circle cx="6" cy="12" r="3"></circle>
              <circle cx="18" cy="19" r="3"></circle>
              <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
              <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
            </svg>
            <span>{copied ? 'Copied Link!' : 'Share'}</span>
          </button>

          <button
            type="button"
            onClick={() => setSaved(!saved)}
            className={`${styles.topActionBtn} ${saved ? styles.savedActive : ''}`}
            title={saved ? 'Job Saved' : 'Save Job'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill={saved ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"></path>
            </svg>
            <span>{saved ? 'Saved' : 'Save'}</span>
          </button>
        </div>
      </div>

      {/* 2. Top Header Job Box */}
      <header className={styles.headerCard}>
        <h1 className={styles.jobTitle}>{job.title}</h1>

        <div className={styles.companyRow}>
          <div className={styles.companyIconBox}>
            <span>JF</span>
          </div>
          <span className={styles.companyName}>
            {job.company || 'Jackson & Frank Client'}
          </span>
          <span className={styles.verifiedBadge}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="20 6 9 17 4 12"></polyline>
            </svg>
            <span>Verified</span>
          </span>
        </div>

        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
              <circle cx="12" cy="10" r="3"></circle>
            </svg>
            <span>{job.location}</span>
          </div>

          <div className={styles.metaItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
              <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
            </svg>
            <span>{displayType}</span>
          </div>

          <div className={styles.metaItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
              <polyline points="9 22 9 12 15 12 15 22"></polyline>
            </svg>
            <span>{displayWorkModel}</span>
          </div>

          <div className={styles.metaItem}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="4" y1="9" x2="20" y2="9"></line>
              <line x1="4" y1="15" x2="20" y2="15"></line>
              <line x1="10" y1="3" x2="8" y2="21"></line>
              <line x1="16" y1="3" x2="14" y2="21"></line>
            </svg>
            <span>Ref: {job.id}</span>
          </div>
        </div>
      </header>

      {/* 3. Main Two-Column Layout */}
      <div className={styles.layout}>
        {/* Left Column: Job Details & Application Form */}
        <main className={styles.mainColumn}>
          {/* Card: Job Description (with Show More) */}
          <section className={styles.cardSection}>
            <h2 className={styles.cardTitle}>Job Description</h2>
            <p className={styles.cardSubtitle}>About the Role</p>

            <ExpandableContent maxHeight={260}>
              {cleanedJobDesc ? (
                <div
                  className={styles.richContent}
                  dangerouslySetInnerHTML={{ __html: cleanedJobDesc }}
                />
              ) : cleanedOverview ? (
                <div
                  className={styles.richContent}
                  dangerouslySetInnerHTML={{ __html: cleanedOverview }}
                />
              ) : (
                <p className={styles.plainText}>{job.description}</p>
              )}
            </ExpandableContent>
          </section>

          {/* Card: Key Responsibilities (if available) */}
          {((job.responsibilities && job.responsibilities.length > 0) || cleanedOverview) && (
            <section className={styles.cardSection}>
              <h2 className={styles.cardTitle}>Key Responsibilities</h2>
              {job.responsibilities && job.responsibilities.length > 0 ? (
                <ul className={styles.checklist}>
                  {job.responsibilities.map((resp, idx) => (
                    <li key={idx} className={styles.checkItem}>
                      <span className={styles.checkIcon}>✓</span>
                      <span>{resp}</span>
                    </li>
                  ))}
                </ul>
              ) : cleanedOverview && cleanedJobDesc ? (
                <div
                  className={styles.richContent}
                  dangerouslySetInnerHTML={{ __html: cleanedOverview }}
                />
              ) : (
                <ul className={styles.checklist}>
                  <li className={styles.checkItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Lead end-to-end integration architecture and ensure high scalability.</span>
                  </li>
                  <li className={styles.checkItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Collaborate with cross-functional global teams and client stakeholders.</span>
                  </li>
                  <li className={styles.checkItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>Maintain documentation, code quality, and best industry practices.</span>
                  </li>
                </ul>
              )}
            </section>
          )}

          {/* Card: Required Skills & Qualifications */}
          <section className={styles.cardSection}>
            <h2 className={styles.cardTitle}>Required Skills & Qualifications</h2>
            {job.requirements && job.requirements.length > 0 ? (
              <ul className={styles.checklist}>
                {job.requirements.map((req, idx) => (
                  <li key={idx} className={styles.checkItem}>
                    <span className={styles.checkIcon}>✓</span>
                    <span>{req}</span>
                  </li>
                ))}
              </ul>
            ) : cleanedRequirements ? (
              <div
                className={styles.richContent}
                dangerouslySetInnerHTML={{ __html: cleanedRequirements }}
              />
            ) : (
              <ul className={styles.checklist}>
                {job.skills && job.skills.length > 0 ? (
                  job.skills.map((skill, idx) => (
                    <li key={idx} className={styles.checkItem}>
                      <span className={styles.checkIcon}>✓</span>
                      <span>Demonstrated expertise and hands-on experience in <strong>{skill}</strong>.</span>
                    </li>
                  ))
                ) : (
                  <>
                    <li className={styles.checkItem}>
                      <span className={styles.checkIcon}>✓</span>
                      <span>Relevant degree or equivalent practical industry experience.</span>
                    </li>
                    <li className={styles.checkItem}>
                      <span className={styles.checkIcon}>✓</span>
                      <span>Strong analytical and problem-solving mindset.</span>
                    </li>
                    <li className={styles.checkItem}>
                      <span className={styles.checkIcon}>✓</span>
                      <span>Fluent professional communication in English (verbal and written).</span>
                    </li>
                  </>
                )}
              </ul>
            )}
          </section>

          {/* Card: Nice to Have */}
          <section className={styles.cardSection}>
            <h2 className={styles.cardTitle}>Nice to Have</h2>
            <ul className={styles.checklist}>
              <li className={styles.checkItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Experience working with agile methodologies, Scrum, and CI/CD pipelines.</span>
              </li>
              <li className={styles.checkItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Prior experience in cross-border international team collaboration.</span>
              </li>
              <li className={styles.checkItem}>
                <span className={styles.checkIcon}>✓</span>
                <span>Relevant industry certifications or advanced training.</span>
              </li>
            </ul>
          </section>

          {/* Card: Compensation & Benefits */}
          <section className={styles.cardSection}>
            <h2 className={styles.cardTitle}>Compensation & Benefits</h2>

            <div className={styles.compGrid}>
              {/* Box 1: Base Salary */}
              <div className={styles.compBox}>
                <div className={styles.compIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"></rect>
                    <line x1="12" y1="8" x2="12" y2="16"></line>
                    <line x1="8" y1="12" x2="16" y2="12"></line>
                  </svg>
                </div>
                <span className={styles.compLabel}>Base Salary</span>
                <span className={styles.compValue}>{job.salary || 'Competitive / Neg.'}</span>
              </div>

              {/* Box 2: Job Type */}
              <div className={styles.compBox}>
                <div className={styles.compIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                    <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                  </svg>
                </div>
                <span className={styles.compLabel}>Job Type</span>
                <span className={styles.compValue}>{displayType}</span>
              </div>

              {/* Box 3: Work Model */}
              <div className={styles.compBox}>
                <div className={styles.compIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"></path>
                    <polyline points="9 22 9 12 15 12 15 22"></polyline>
                  </svg>
                </div>
                <span className={styles.compLabel}>Work Model</span>
                <span className={styles.compValue}>{displayWorkModel}</span>
              </div>

              {/* Box 4: Location */}
              <div className={styles.compBox}>
                <div className={styles.compIcon}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"></path>
                    <circle cx="12" cy="10" r="3"></circle>
                  </svg>
                </div>
                <span className={styles.compLabel}>Location</span>
                <span className={styles.compValue}>{job.location}</span>
              </div>
            </div>

            {cleanedBenefits && (
              <div
                className={`${styles.richContent} ${styles.benefitsExtra}`}
                dangerouslySetInnerHTML={{ __html: cleanedBenefits }}
              />
            )}
          </section>

          {/* Blue Discovery Banner */}
          <div className={styles.discoveryBanner}>
            <div className={styles.discoveryLeft}>
              <div className={styles.discoveryIcon}>
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="16" x2="12" y2="12"></line>
                  <line x1="12" y1="8" x2="12.01" y2="8"></line>
                </svg>
              </div>
              <span className={styles.discoveryText}>
                Discover more {job.industry || 'IT'} opportunities in {job.city || 'Netherlands'}
              </span>
            </div>
            <Link href="/vacancies" className={styles.discoveryLink}>
              <span>Explore similar roles</span>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </Link>
          </div>
        </main>

        {/* Right Column: Sidebar */}
        <aside className={styles.sidebar}>
          {/* Sidebar 1: Primary Action Card */}
          <div className={styles.actionCard}>
            <button
              type="button"
              onClick={scrollToApply}
              className={styles.primaryApplyBtn}
            >
              <span>Apply Now</span>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <line x1="5" y1="12" x2="19" y2="12"></line>
                <polyline points="12 5 19 12 12 19"></polyline>
              </svg>
            </button>
            <p className={styles.quickApplyNote}>
              Takes only 2 minutes • Quick apply with your CV
            </p>
          </div>

          {/* Sidebar 2: About the Company */}
          <div className={styles.sidebarCard}>
            <div className={styles.aboutHeader}>
              <div className={styles.aboutLogoBox}>
                <span>JF</span>
              </div>
              <div>
                <div className={styles.aboutNameRow}>
                  <h3 className={styles.aboutTitle}>Jackson & Frank Client</h3>
                  <span className={styles.aboutVerifiedCheck}>✓</span>
                </div>
                <span className={styles.aboutClientBadge}>VERIFIED CLIENT</span>
              </div>
            </div>

            <p className={styles.aboutDesc}>
              Jackson & Frank is a global talent solutions partner connecting world-class engineering, finance, and specialized technology professionals with premier employers.
            </p>

            <div className={styles.companyMetaList}>
              <div className={styles.companyMetaItem}>
                <span className={styles.companyMetaIcon}>🏢</span>
                <span className={styles.companyMetaText}>Industry: {job.industry || 'IT & Software'}</span>
              </div>
              <div className={styles.companyMetaItem}>
                <span className={styles.companyMetaIcon}>👥</span>
                <span className={styles.companyMetaText}>50 - 250 employees</span>
              </div>
              <div className={styles.companyMetaItem}>
                <span className={styles.companyMetaIcon}>📍</span>
                <span className={styles.companyMetaText}>Headquarters: {job.location || 'Netherlands'}</span>
              </div>
              <div className={styles.companyMetaItem}>
                <span className={styles.companyMetaIcon}>🌐</span>
                <a
                  href="https://www.jacksonandfrank.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className={styles.companyWebLink}
                >
                  www.jacksonandfrank.com
                </a>
              </div>
            </div>

            <a
              href="https://www.jacksonandfrank.com"
              target="_blank"
              rel="noopener noreferrer"
              className={styles.viewProfileBtn}
            >
              <span>View Company Profile</span>
              <span>→</span>
            </a>
          </div>

          {/* Sidebar 3: Hiring Consultant */}
          <div className={styles.sidebarCard}>
            <div className={styles.consultantRow}>
              <div className={styles.consultantAvatar}>
                {job.consultant?.avatar ? (
                  <img
                    src={job.consultant.avatar}
                    alt={job.consultant.name || 'Consultant'}
                    className={styles.consultantImg}
                  />
                ) : (
                  <span>{job.consultant?.name ? job.consultant.name.charAt(0) : 'M'}</span>
                )}
              </div>
              <div>
                <h4 className={styles.consultantName}>
                  {job.consultant?.name || 'Michael van Beek'}
                </h4>
                <p className={styles.consultantRole}>
                  {job.consultant?.title || 'Senior Talent Consultant'}
                </p>
                {job.consultant?.email ? (
                  <a href={`mailto:${job.consultant.email}`} className={styles.consultantEmailLink}>
                    {job.consultant.email}
                  </a>
                ) : (
                  <a href="mailto:careers@jacksonandfrank.com" className={styles.consultantEmailLink}>
                    careers@jacksonandfrank.com
                  </a>
                )}
              </div>
            </div>
          </div>

          {/* Sidebar 4: Similar Jobs */}
          {similarJobs.length > 0 && (
            <div className={styles.sidebarCard}>
              <div className={styles.similarHeader}>
                <h3 className={styles.sidebarSectionTitle}>Similar Jobs</h3>
                <Link href="/vacancies" className={styles.viewAllSimilar}>
                  View All
                </Link>
              </div>

              <div className={styles.similarList}>
                {similarJobs.map((sJob) => (
                  <Link
                    key={sJob.id}
                    href={`/vacancies/${sJob.id}`}
                    className={styles.similarItem}
                  >
                    <div className={styles.similarIconBox}>
                      <span>JF</span>
                    </div>
                    <div className={styles.similarContent}>
                      <h4 className={styles.similarTitle}>{sJob.title}</h4>
                      <p className={styles.similarMeta}>
                        {sJob.location} • {sJob.type}
                      </p>
                    </div>
                    <span className={styles.similarArrow}>›</span>
                  </Link>
                ))}
              </div>
            </div>
          )}

          {/* Sidebar 5: Get Job Alerts */}
          <div className={styles.alertCard}>
            <div className={styles.alertIconBox}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#2563EB" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"></path>
                <path d="M13.73 21a2 2 0 0 1-3.46 0"></path>
              </svg>
            </div>
            <h3 className={styles.alertTitle}>Get Job Alerts</h3>
            <p className={styles.alertDesc}>
              Be the first to know about new opportunities matching your profile.
            </p>
            <Link
              href="/job-alert"
              className={styles.alertBtn}
              onClick={(e) => {
                e.preventDefault();
                openJobAlertModal();
              }}
            >
              Subscribe Now →
            </Link>
          </div>
        </aside>
      </div>

      {/* 4. Full-Width Bottom Application Form */}
      <section id="application-form" className={styles.formSection}>
        <h2 className={styles.formTitle}>Interested? Send us your application!</h2>

        {formStatus === 'success' ? (
          <div className={styles.successMessage}>
            <div className={styles.successIcon}>✓</div>
            <h3>Application Submitted Successfully!</h3>
            <p>
              Thank you, {firstName || 'Applicant'}. We have received your application for{' '}
              <strong>{job.title}</strong>. Our recruitment consultants will contact you shortly.
            </p>
            <button
              type="button"
              onClick={() => setFormStatus('idle')}
              className={styles.resetFormBtn}
            >
              Submit another application
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmitApplication} className={styles.appForm}>
            {formError && (
              <div className={styles.formErrorBanner}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10"></circle>
                  <line x1="12" y1="8" x2="12" y2="12"></line>
                  <line x1="12" y1="16" x2="12.01" y2="16"></line>
                </svg>
                <span>{formError}</span>
              </div>
            )}

            <div className={styles.formGrid}>
              {/* Left Column: Form Fields */}
              <div className={styles.formInputsCol}>
                <div className={styles.formRow}>
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      required
                      placeholder="First name *"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>

                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      required
                      placeholder="Last name *"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={styles.formInput}
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="tel"
                    required
                    placeholder="Phone *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.formInput}
                  />
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="email"
                    required
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.formInput}
                  />
                </div>
              </div>

              {/* Right Column: CV Upload Box */}
              <div className={styles.formUploadCol}>
                <div
                  className={`${styles.dropZone} ${isDragging ? styles.dropZoneActive : ''}`}
                  onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                  onDragLeave={() => setIsDragging(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                >
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".pdf,.doc,.docx"
                    onChange={handleFileChange}
                    style={{ display: 'none' }}
                  />

                  {cvFile ? (
                    <div className={styles.uploadedFileBox}>
                      <div className={styles.fileIcon}>📄</div>
                      <div className={styles.fileDetails}>
                        <span className={styles.fileName}>{cvFile.name}</span>
                        <span className={styles.fileSize}>
                          {(cvFile.size / 1024 / 1024).toFixed(2)} MB
                        </span>
                      </div>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          setCvFile(null);
                        }}
                        className={styles.removeFileBtn}
                        title="Remove File"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <div className={styles.dropZoneContent}>
                      <div className={styles.uploadCloudIcon}>
                        <svg width="48" height="42" viewBox="0 0 24 24" fill="none" stroke="#1E3A8A" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M4 14.899A7 7 0 1 1 15.71 8h1.79a4.5 4.5 0 0 1 2.5 8.242"></path>
                          <path d="M12 12v8"></path>
                          <path d="m16 15-4-4-4 4"></path>
                        </svg>
                      </div>
                      <div className={styles.dropZoneTexts}>
                        <span className={styles.uploadPrompt}>
                          Upload CV <span className={styles.requiredStar}>*</span>
                        </span>
                        <span className={styles.uploadHint}>Drag & Drop or Browse</span>
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Agreement Checkbox */}
            <div className={styles.checkboxRow}>
              <input
                type="checkbox"
                id="terms"
                checked={agreedToTerms}
                onChange={(e) => setAgreedToTerms(e.target.checked)}
                className={styles.checkboxInput}
              />
              <label htmlFor="terms" className={styles.checkboxLabel}>
                I agree with the privacy conditions.
              </label>
            </div>

            {/* Submit Action */}
            <button
              type="submit"
              disabled={formStatus === 'submitting'}
              className={styles.submitAppBtn}
            >
              {formStatus === 'submitting' ? 'Submitting...' : 'Send application'}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
