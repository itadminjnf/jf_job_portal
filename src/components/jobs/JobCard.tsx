'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Bookmark, MapPin, Clock, ArrowRight } from 'lucide-react';
import { Job } from '@/types/job';
import styles from './JobCard.module.css';

interface JobCardProps {
  job: Job;
}

export function JobCard({ job }: JobCardProps) {
  const [isBookmarked, setIsBookmarked] = useState(false);
  const [showAllSkills, setShowAllSkills] = useState(false);

  return (
    <article className={styles.card}>
      {/* Header: Type / Salary Badges & Bookmark */}
      <div className={styles.header}>
        <div className={styles.badgeGroup}>
          <span className={styles.typeBadge}>{job.type}</span>
          {job.salary && (
            <span className={styles.salaryBadge}>{job.salary}</span>
          )}
        </div>
      </div>

      {/* Job Title & Company */}
      <Link href={`/vacancies/${job.slug || job.id}`} className={styles.titleLink}>
        <h3 className={styles.title}>{job.title}</h3>
      </Link>
      <p className={styles.companyName}>{job.company}</p>

      {/* Metadata */}
      <div className={styles.metadata}>
        <div className={styles.metaRow}>
          <div className={styles.metaItem}>
            <MapPin size={15} className={styles.metaIcon} />
            <span>{job.location}</span>
          </div>

          <div className={styles.metaItem}>
            <Clock size={15} className={styles.metaIcon} />
            <span>{job.experience}</span>
          </div>
        </div>
      </div>

      {/* Skills (Max 3 visible by default, expandable with Show More) */}
      {job.skills && job.skills.length > 0 && (
        <div className={styles.skillsList} aria-label="Required skills">
          {(showAllSkills ? job.skills : job.skills.slice(0, 3)).map((skill, idx) => (
            <span key={`${skill}-${idx}`} className={styles.skillBadge}>
              {skill}
            </span>
          ))}

          {job.skills.length > 3 && (
            <button
              type="button"
              className={styles.moreSkillsBtn}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                setShowAllSkills(!showAllSkills);
              }}
              title={showAllSkills ? 'Show fewer skills' : 'Show all skills'}
            >
              {showAllSkills ? 'Show less' : `+${job.skills.length - 3} more`}
            </button>
          )}
        </div>
      )}

      {/* Footer: Posted time & View Job button */}
      <div className={styles.footer}>
        <span className={styles.postedTime}>{job.postedTime}</span>
        <Link href={`/vacancies/${job.slug || job.id}`} className={styles.viewJobBtn}>
          <span>View Job</span>
          <ArrowRight size={14} strokeWidth={2.5} />
        </Link>
      </div>
    </article>
  );
}
