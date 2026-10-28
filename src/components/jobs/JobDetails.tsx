'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import {
  Share2,
  Bookmark,
  CheckCircle2,
  Check,
  MapPin,
  Briefcase,
  Home,
  Building2,
  Users,
  Globe,
  Bell,
  ArrowRight,
  ChevronDown,
  UploadCloud,
  FileText,
  Mail,
  X,
  AlertCircle,
  Hash,
  CircleDollarSign,
  Sparkles,
  RefreshCw,
  AlertTriangle,
  WifiOff,
  FileWarning,
  HelpCircle,
} from 'lucide-react';
import { useJobAlertModal } from '@/context/JobAlertModalContext';
import { Job } from '@/types/job';
import { cleanRichHtml, translateDutchToEnglish } from '@/lib/utils';
import { Loader } from '@/components/common/Loader';
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
            <ChevronDown
              size={16}
              strokeWidth={2.5}
              className={`${styles.chevronIcon} ${expanded ? styles.chevronRotated : ''}`}
              aria-hidden="true"
            />
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

  // Error & Retry Modal Popup State
  const [errorModal, setErrorModal] = useState<{
    isOpen: boolean;
    type: 'file_size' | 'network' | 'format' | 'generic';
    title: string;
    message: string;
    tip?: string;
    actionText?: string;
  }>({
    isOpen: false,
    type: 'generic',
    title: '',
    message: '',
  });

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

  const validateAndSetCvFile = (file: File): boolean => {
    const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10 MB limit
    const ext = file.name.split('.').pop()?.toLowerCase();
    const allowedExtensions = ['pdf', 'doc', 'docx'];

    if (!ext || !allowedExtensions.includes(ext)) {
      setErrorModal({
        isOpen: true,
        type: 'format',
        title: 'Unsupported Document Format',
        message: `The file format ".${ext || 'unknown'}" is not supported. Please upload your CV in PDF (.pdf) or Word (.doc, .docx) format.`,
        tip: 'Tip: You can easily save your resume as a PDF in MS Word, Google Docs, or Pages.',
        actionText: 'Choose Another File',
      });
      return false;
    }

    if (file.size > MAX_FILE_SIZE) {
      const sizeInMb = (file.size / (1024 * 1024)).toFixed(1);
      setErrorModal({
        isOpen: true,
        type: 'file_size',
        title: 'Document Size Exceeds 10 MB',
        message: `Your file "${file.name}" is ${sizeInMb} MB, which exceeds our maximum upload limit of 10 MB.`,
        tip: 'Please compress your document or remove high-resolution embedded images before uploading.',
        actionText: 'Select Smaller File',
      });
      return false;
    }

    setCvFile(file);
    setFormError('');
    return true;
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      validateAndSetCvFile(e.target.files[0]);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      validateAndSetCvFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmitApplication = async (e?: React.FormEvent) => {
    if (e && e.preventDefault) {
      e.preventDefault();
    }
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
      setErrorModal({
        isOpen: true,
        type: 'format',
        title: 'CV File Required',
        message: 'A resume/CV is required to apply for this vacancy. Please upload your CV in PDF (.pdf) or Word (.doc, .docx) format.',
        tip: 'Click on the "Upload CV" box or drag & drop your file directly.',
        actionText: 'Upload CV Now',
      });
      return;
    }

    if (!agreedToTerms) {
      setFormError('Please agree with the privacy conditions before submitting.');
      return;
    }

    try {
      setFormStatus('submitting');

      // Check online status before upload
      if (typeof navigator !== 'undefined' && !navigator.onLine) {
        throw new Error('You appear to be offline. Please check your internet connection.');
      }

      // 1. Upload CV to /api/files
      const fileFormData = new FormData();
      fileFormData.append('file', cvFile);

      const fileResponse = await fetch('/api/files', {
        method: 'POST',
        body: fileFormData,
      });

      const fileData = await fileResponse.json().catch(() => ({}));
      console.log('[Files API Response]:', fileData);

      if (!fileResponse.ok) {
        if (fileResponse.status === 413) {
          throw new Error('Document size exceeds the server limit. Please upload a CV smaller than 10 MB.');
        }
        throw new Error(fileData?.error || 'Failed to upload CV file. Please try again.');
      }

      const fileId = Array.isArray(fileData) ? fileData[0]?.id : fileData.id;
      const owsFileUid = fileData.owsFileUid || null;
      if (!fileId && !owsFileUid) {
        throw new Error('CV upload did not return a valid file ID. Please try again.');
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

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data?.error || 'Failed to submit application to the server. Please try again.');
      }

      // 3. Success state and clear form
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

      const isNetwork =
        (typeof navigator !== 'undefined' && !navigator.onLine) ||
        (err instanceof TypeError && err.message.toLowerCase().includes('fetch')) ||
        message.toLowerCase().includes('network') ||
        message.toLowerCase().includes('failed to fetch') ||
        message.toLowerCase().includes('offline');

      const isDocSize =
        message.toLowerCase().includes('size') ||
        message.toLowerCase().includes('large') ||
        message.toLowerCase().includes('413') ||
        message.toLowerCase().includes('payload');

      if (isDocSize) {
        setErrorModal({
          isOpen: true,
          type: 'file_size',
          title: 'Document Size Too Large',
          message: 'The server rejected your CV because the file size is too large (maximum 10 MB).',
          tip: 'Please compress your PDF/Word document or remove large images before re-uploading.',
          actionText: 'Select Smaller CV & Re-apply',
        });
      } else if (isNetwork) {
        setErrorModal({
          isOpen: true,
          type: 'network',
          title: 'Network Connection Issue',
          message: 'We were unable to communicate with the recruitment server. Please check your internet connection and retry.',
          tip: 'All your application details are safely saved. Click "Retry Application" to send it again immediately.',
          actionText: 'Retry Application',
        });
      } else {
        setErrorModal({
          isOpen: true,
          type: 'generic',
          title: 'Application Submission Issue',
          message: message || 'Something went wrong while processing your application. Please re-apply.',
          tip: 'Your entered details have been preserved. You can click "Re-apply Now" or review the form.',
          actionText: 'Re-apply Now',
        });
      }
    }
  };

  const handleRetryOrFix = () => {
    const currentType = errorModal.type;
    setErrorModal((prev) => ({ ...prev, isOpen: false }));

    if (currentType === 'file_size' || currentType === 'format') {
      setCvFile(null);
      scrollToApply();
      setTimeout(() => {
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
          fileInputRef.current.click();
        }
      }, 350);
    } else {
      // Direct retry
      handleSubmitApplication();
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
            <Share2 size={15} />
            <span>{copied ? 'Copied Link!' : 'Share'}</span>
          </button>


        </div>
      </div>

      {/* 2. Top Header Job Box */}
      <header className={styles.headerCard}>
        <div className={styles.headerCardInner}>
          <div className={styles.headerCardLeft}>
            <h1 className={styles.jobTitle}>{job.title}</h1>

            <div className={styles.companyRow}>
              <div className={styles.companyLogoBox}>
                <img
                  src="/app/favicon.ico"
                  alt="Jackson & Frank"
                  className={styles.companyLogoImg}
                />
              </div>
              <span className={styles.companyName}>
                {job.company || 'Jackson & Frank Client'}
              </span>
              <span className={styles.verifiedBadge}>
                <CheckCircle2 size={13} strokeWidth={2.5} />
                <span>Verified</span>
              </span>
            </div>

            <div className={styles.metaRow}>
              <div className={styles.metaItem}>
                <MapPin size={15} />
                <span>{job.location}</span>
              </div>

              <div className={styles.metaItem}>
                <Briefcase size={15} />
                <span>{displayType}</span>
              </div>

              <div className={styles.metaItem}>
                <Home size={15} />
                <span>{displayWorkModel}</span>
              </div>

              {Boolean((job as any).referenceNumber && typeof (job as any).referenceNumber === 'string' && !(job as any).referenceNumber.match(/^[a-zA-Z0-9_-]{12,}$/)) && (
                <div className={styles.metaItem}>
                  <Hash size={15} />
                  <span>Ref: {(job as any).referenceNumber}</span>
                </div>
              )}
            </div>
          </div>

          <div className={styles.headerCardRight}>
            <button
              type="button"
              onClick={scrollToApply}
              className={styles.primaryApplyBtn}
            >
              <span>Apply Now</span>
              <ArrowRight size={16} strokeWidth={2.5} />
            </button>
            <p className={styles.quickApplyNote}>
              Takes only 2 minutes • Quick apply with your CV
            </p>
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
                  <CircleDollarSign size={20} />
                </div>
                <span className={styles.compLabel}>Base Salary</span>
                <span className={styles.compValue}>{job.salary || 'Competitive / Neg.'}</span>
              </div>

              {/* Box 2: Job Type */}
              <div className={styles.compBox}>
                <div className={styles.compIcon}>
                  <Briefcase size={20} />
                </div>
                <span className={styles.compLabel}>Job Type</span>
                <span className={styles.compValue}>{displayType}</span>
              </div>

              {/* Box 3: Work Model */}
              <div className={styles.compBox}>
                <div className={styles.compIcon}>
                  <Home size={20} />
                </div>
                <span className={styles.compLabel}>Work Model</span>
                <span className={styles.compValue}>{displayWorkModel}</span>
              </div>

              {/* Box 4: Location */}
              <div className={styles.compBox}>
                <div className={styles.compIcon}>
                  <MapPin size={20} />
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
                <Sparkles size={18} />
              </div>
              <span className={styles.discoveryText}>
                Discover more {job.industry || 'IT'} opportunities in {job.city || 'Netherlands'}
              </span>
            </div>
            <Link href="/vacancies" className={styles.discoveryLink}>
              <span>Explore similar roles</span>
              <ArrowRight size={14} />
            </Link>
          </div>
        </main>

        {/* Right Column: Sidebar */}
        <aside className={styles.sidebar}>
          {/* Sidebar 1: About the Company */}
          <div className={styles.sidebarCard}>
            <div className={styles.aboutHeader}>
              <div className={styles.aboutLogoBox}>
                <img
                  src="/app/favicon.ico"
                  alt="Jackson & Frank"
                  className={styles.aboutLogoImg}
                />
              </div>
              <div>
                <div className={styles.aboutNameRow}>
                  <h3 className={styles.aboutTitle}>Jackson & Frank Client</h3>
                  <span className={styles.aboutVerifiedCheck}>
                    <Check size={11} strokeWidth={3} />
                  </span>
                </div>
                <span className={styles.aboutClientBadge}>VERIFIED CLIENT</span>
              </div>
            </div>

            <p className={styles.aboutDesc}>
              Jackson & Frank is a global talent solutions partner connecting world-class engineering, finance, and specialized technology professionals with premier employers.
            </p>

            <div className={styles.companyMetaList}>
              <div className={styles.companyMetaItem}>
                <Building2 size={16} className={styles.companyMetaLucideIcon} />
                <span className={styles.companyMetaText}>Industry: {job.industry || 'IT & Software'}</span>
              </div>
              <div className={styles.companyMetaItem}>
                <Users size={16} className={styles.companyMetaLucideIcon} />
                <span className={styles.companyMetaText}>50 - 250 employees</span>
              </div>
              <div className={styles.companyMetaItem}>
                <MapPin size={16} className={styles.companyMetaLucideIcon} />
                <span className={styles.companyMetaText}>Headquarters: {job.location || 'Netherlands'}</span>
              </div>
              <div className={styles.companyMetaItem}>
                <Globe size={16} className={styles.companyMetaLucideIcon} />
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
              <ArrowRight size={14} />
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
                    <Mail size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                    {job.consultant.email}
                  </a>
                ) : (
                  <a href="mailto:careers@jacksonandfrank.com" className={styles.consultantEmailLink}>
                    <Mail size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
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
                    href={`/vacancies/${sJob.slug || sJob.id}`}
                    className={styles.similarItem}
                  >
                    <div className={styles.similarLogoBox}>
                      <img
                        src="/app/favicon.ico"
                        alt="Jackson & Frank"
                        className={styles.similarLogoImg}
                      />
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
              <Bell size={20} color="#2563EB" />
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
            <div className={styles.successIcon}>
              <CheckCircle2 size={30} color="#16A34A" />
            </div>
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
                <AlertCircle size={16} />
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
                      <div className={styles.fileIcon}>
                        <FileText size={22} color="#1E3A8A" />
                      </div>
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
                        <X size={15} />
                      </button>
                    </div>
                  ) : (
                    <div className={styles.dropZoneContent}>
                      <div className={styles.uploadCloudIcon}>
                        <UploadCloud size={44} color="#1E3A8A" strokeWidth={1.8} />
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
              {formStatus === 'submitting' ? (
                <Loader variant="button" size="sm" color="white" text="Submitting application..." />
              ) : (
                'Send application'
              )}
            </button>
          </form>
        )}
      </section>

      {/* 5. Error & Retry Popup Modal */}
      {errorModal.isOpen && (
        <div
          className={styles.modalBackdrop}
          onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
          role="dialog"
          aria-modal="true"
          aria-labelledby="error-modal-title"
        >
          <div
            className={styles.errorModalCard}
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
              className={styles.modalCloseBtn}
              aria-label="Close modal"
            >
              <X size={18} />
            </button>

            {/* Icon Circle */}
            <div
              className={`${styles.modalIconWrapper} ${
                errorModal.type === 'file_size' || errorModal.type === 'format'
                  ? styles.modalIconFileSize
                  : errorModal.type === 'network'
                  ? styles.modalIconNetwork
                  : styles.modalIconGeneric
              }`}
            >
              {errorModal.type === 'file_size' || errorModal.type === 'format' ? (
                <FileWarning size={32} />
              ) : errorModal.type === 'network' ? (
                <WifiOff size={32} />
              ) : (
                <AlertTriangle size={32} />
              )}
            </div>

            {/* Error Category Badge */}
            <span
              className={`${styles.modalBadge} ${
                errorModal.type === 'file_size' || errorModal.type === 'format'
                  ? styles.badgeFileSize
                  : errorModal.type === 'network'
                  ? styles.badgeNetwork
                  : styles.badgeGeneric
              }`}
            >
              {errorModal.type === 'file_size'
                ? 'DOCUMENT SIZE'
                : errorModal.type === 'format'
                ? 'FORMAT ISSUE'
                : errorModal.type === 'network'
                ? 'NETWORK ISSUE'
                : 'SUBMISSION ISSUE'}
            </span>

            <h3 id="error-modal-title" className={styles.modalTitle}>
              {errorModal.title}
            </h3>

            <p className={styles.modalDesc}>{errorModal.message}</p>

            {errorModal.tip && (
              <div className={styles.modalTipBox}>
                <HelpCircle size={18} className={styles.modalTipIcon} />
                <span>{errorModal.tip}</span>
              </div>
            )}

            <div className={styles.modalActions}>
              <button
                type="button"
                onClick={() => setErrorModal((prev) => ({ ...prev, isOpen: false }))}
                className={styles.cancelModalBtn}
              >
                Edit Form
              </button>

              <button
                type="button"
                onClick={handleRetryOrFix}
                className={styles.retryBtn}
              >
                <RefreshCw size={17} />
                <span>{errorModal.actionText || 'Retry Application'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
