'use client';

import React from 'react';
import styles from './JobFilters.module.css';

interface JobFiltersProps {
  selectedLocation: string;
  onLocationChange: (loc: string) => void;
  selectedType: string;
  onTypeChange: (type: string) => void;
  onClear: () => void;
}

export function JobFilters({
  selectedLocation,
  onLocationChange,
  selectedType,
  onTypeChange,
  onClear,
}: JobFiltersProps) {
  const locations = ['All Locations'];
  const jobTypes = ['All Types', 'Full Time', 'Permanent', 'Contract'];

  return (
    <div className={styles.filterCard}>
      <div className={styles.filterHeader}>
        <h3 className={styles.filterTitle}>Filters</h3>
        <button onClick={onClear} className={styles.clearBtn}>
          Reset All
        </button>
      </div>

      {/* Location Filter */}
      <div className={styles.filterGroup}>
        <h4 className={styles.groupTitle}>Location</h4>
        <div className={styles.optionList}>
          {locations.map((loc) => {
            const isChecked = (loc === 'All Locations' && !selectedLocation) || selectedLocation === loc;
            return (
              <label key={loc} className={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="filter-location"
                  checked={isChecked}
                  onChange={() => onLocationChange(loc === 'All Locations' ? '' : loc)}
                  className={styles.checkbox}
                />
                <span>{loc}</span>
              </label>
            );
          })}
        </div>
      </div>

      {/* Job Type Filter */}
      <div className={styles.filterGroup}>
        <h4 className={styles.groupTitle}>Employment Type</h4>
        <div className={styles.optionList}>
          {jobTypes.map((type) => {
            const isChecked = (type === 'All Types' && !selectedType) || selectedType === type;
            return (
              <label key={type} className={styles.checkboxLabel}>
                <input
                  type="radio"
                  name="filter-jobtype"
                  checked={isChecked}
                  onChange={() => onTypeChange(type === 'All Types' ? '' : type)}
                  className={styles.checkbox}
                />
                <span>{type}</span>
              </label>
            );
          })}
        </div>
      </div>
    </div>
  );
}
