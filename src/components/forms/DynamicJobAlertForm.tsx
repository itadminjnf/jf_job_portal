'use client';

import React, { useState, useEffect, useId } from 'react';
import {
  JobAlertField,
  JobAlertFieldOption,
  NormalizedJobAlertForm,
  buildJobAlertPayload,
} from '@/lib/api';
import styles from './DynamicJobAlertForm.module.css';
import { FileText, Globe, Building2, Sparkles, Calendar } from 'lucide-react';

interface DynamicJobAlertFormProps {
  initialFormDefinition?: NormalizedJobAlertForm;
  apiEndpoint?: string;
  onSuccess?: (data: unknown) => void;
  onClose?: () => void;
}

export function DynamicJobAlertForm({
  initialFormDefinition,
  apiEndpoint = '/api/otys/job-alert',
  onSuccess,
  onClose,
}: DynamicJobAlertFormProps) {
  const [formDef, setFormDef] = useState<NormalizedJobAlertForm | null>(
    initialFormDefinition || null
  );
  const [isLoading, setIsLoading] = useState(!initialFormDefinition);
  const [fetchError, setFetchError] = useState<string | null>(null);

  const [formValues, setFormValues] = useState<Record<string, unknown>>({});
  const [keyword, setKeyword] = useState<string>('');
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmittedSuccess, setIsSubmittedSuccess] = useState(false);
  const [submittedEmail, setSubmittedEmail] = useState('');

  // Track expanded state for multiselects with many options (e.g. Branche, Skills)
  const [expandedFields, setExpandedFields] = useState<Record<string, boolean>>({});
  const [searchFilter, setSearchFilter] = useState<Record<string, string>>({});

  // 1. Fetch form definition from server API
  const loadFormDefinition = async () => {
    setIsLoading(true);
    setFetchError(null);
    try {
      const res = await fetch(apiEndpoint, {
        method: 'GET',
        headers: { Accept: 'application/json' },
      });

      if (!res.ok) {
        throw new Error(`Failed to load form (${res.status})`);
      }

      const json = await res.json();
      if (!json.success || !json.data) {
        throw new Error(json.error || 'Invalid form response');
      }

      const data: NormalizedJobAlertForm = json.data;
      setFormDef(data);
      initializeValues(data.fields);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[DynamicJobAlertForm] Error fetching form definition:', msg);
      setFetchError("We couldn't load the job alert form right now. Please try again later.");
    } finally {
      setIsLoading(false);
    }
  };

  const initializeValues = (fields: JobAlertField[]) => {
    const initial: Record<string, unknown> = {};
    for (const field of fields) {
      if (field.defaultValue !== undefined) {
        initial[field.id] = field.defaultValue;
      } else if (field.type === 'multiselect') {
        initial[field.id] = [];
      } else {
        initial[field.id] = '';
      }
    }
    setFormValues(initial);
    setKeyword('');
    setErrors({});
  };

  useEffect(() => {
    if (!initialFormDefinition) {
      loadFormDefinition();
    } else {
      initializeValues(initialFormDefinition.fields);
    }
  }, [initialFormDefinition, apiEndpoint]);

  // Multiselect toggle
  const handleCheckboxToggle = (fieldId: string, optionValue: string) => {
    const current = (formValues[fieldId] as string[]) || [];
    const isSelected = current.includes(optionValue);
    const updated = isSelected
      ? current.filter((v) => v !== optionValue)
      : [...current, optionValue];

    setFormValues((prev) => ({
      ...prev,
      [fieldId]: updated,
    }));

    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  // Single field change
  const handleFieldChange = (fieldId: string, value: unknown) => {
    setFormValues((prev) => ({
      ...prev,
      [fieldId]: value,
    }));

    if (errors[fieldId]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[fieldId];
        return next;
      });
    }
  };

  const toggleExpand = (fieldId: string) => {
    setExpandedFields((prev) => ({
      ...prev,
      [fieldId]: !prev[fieldId],
    }));
  };

  // Validation
  const validateForm = (): boolean => {
    if (!formDef) return false;

    const newErrors: Record<string, string> = {};

    for (const field of formDef.fields) {
      const val = formValues[field.id];

      // Required validation
      if (field.required) {
        if (field.type === 'multiselect') {
          if (!Array.isArray(val) || val.length === 0) {
            newErrors[field.id] = `${field.label} is required.`;
          }
        } else if (val === undefined || val === null || String(val).trim() === '') {
          newErrors[field.id] = `${field.label} cannot be blank.`;
        }
      }

      // Email format validation
      if (field.type === 'email' && val && typeof val === 'string' && val.trim()) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(val.trim())) {
          newErrors[field.id] = 'Please enter a valid email address.';
        }
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Submit Handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!formDef || !validateForm()) {
      return;
    }

    setIsSubmitting(true);

    try {
      const emailField = formDef.fields.find((f) => f.type === 'email');
      const emailVal = emailField ? String(formValues[emailField.id] || '') : '';
      setSubmittedEmail(emailVal);

      // Build OTYS payload
      const payload = buildJobAlertPayload(formDef.fields, formValues);

      // Extract client UTM parameters if present in browser URL
      let clientUtmTags: Record<string, string> | undefined = undefined;
      if (typeof window !== 'undefined' && window.location.search) {
        const searchParams = new URLSearchParams(window.location.search);
        const source = searchParams.get('utm_source');
        const medium = searchParams.get('utm_medium');
        const campaign = searchParams.get('utm_campaign');
        const term = searchParams.get('utm_term');
        const content = searchParams.get('utm_content');

        if (source || medium || campaign || term || content) {
          clientUtmTags = {
            ...(source ? { source } : {}),
            ...(medium ? { medium } : {}),
            ...(campaign ? { campaign } : {}),
            ...(term ? { term } : {}),
            ...(content ? { content } : {}),
          };
        }
      }

      const res = await fetch(apiEndpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          fields: formDef.fields,
          formValues,
          answers: payload.answers,
          metaData: clientUtmTags ? { utmTags: clientUtmTags } : undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(
          json.error || 'Failed to submit job alert. Please try again.'
        );
      }

      setIsSubmittedSuccess(true);
      if (onSuccess) {
        onSuccess(json);
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[DynamicJobAlertForm] Submission error:', msg);
      setSubmitError(
        'Unable to complete your job alert subscription. Please review your details and try again.'
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  // Loading State (1:1 size matching the actual form layout)
  if (isLoading) {
    return (
      <div className={styles.skeletonCard} aria-label="Loading job alert form">
        {/* Header Skeleton */}
        <div className={styles.cardHeader}>
          <div className={styles.skeletonTitle}></div>
          <button
            type="button"
            className={styles.closeButton}
            onClick={onClose}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        {/* Form Body Skeleton with 2-column layout */}
        <div className={styles.skeletonBody}>
          {/* Left Column: Checkbox Groups */}
          <div className={styles.skeletonLeftCol}>
            {/* Group 1: Contract Type */}
            <div className={styles.skeletonGroup}>
              <div className={styles.skeletonGroupTitle} style={{ width: '120px' }}></div>
              <div className={styles.skeletonCheckList}>
                <div className={styles.skeletonCheckRow}>
                  <div className={styles.skeletonCheckbox}></div>
                  <div className={styles.skeletonLine} style={{ width: '90px' }}></div>
                </div>
                <div className={styles.skeletonCheckRow}>
                  <div className={styles.skeletonCheckbox}></div>
                  <div className={styles.skeletonLine} style={{ width: '110px' }}></div>
                </div>
                <div className={styles.skeletonCheckRow}>
                  <div className={styles.skeletonCheckbox}></div>
                  <div className={styles.skeletonLine} style={{ width: '160px' }}></div>
                </div>
              </div>
            </div>

            {/* Group 2: Language */}
            <div className={styles.skeletonGroup}>
              <div className={styles.skeletonGroupTitle} style={{ width: '85px' }}></div>
              <div className={styles.skeletonCheckList}>
                <div className={styles.skeletonCheckRow}>
                  <div className={styles.skeletonCheckbox}></div>
                  <div className={styles.skeletonLine} style={{ width: '95px' }}></div>
                </div>
                <div className={styles.skeletonCheckRow}>
                  <div className={styles.skeletonCheckbox}></div>
                  <div className={styles.skeletonLine} style={{ width: '75px' }}></div>
                </div>
                <div className={styles.skeletonCheckRow}>
                  <div className={styles.skeletonCheckbox}></div>
                  <div className={styles.skeletonLine} style={{ width: '60px' }}></div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Inputs & Submit Button */}
          <div className={styles.skeletonRightCol}>
            {/* Keyword */}
            <div className={styles.skeletonField}>
              <div className={styles.skeletonLabel} style={{ width: '70px' }}></div>
              <div className={styles.skeletonInput}></div>
            </div>

            {/* Branche */}
            <div className={styles.skeletonField}>
              <div className={styles.skeletonLabel} style={{ width: '60px' }}></div>
              <div className={styles.skeletonInput}></div>
            </div>

            {/* Skills */}
            <div className={styles.skeletonField}>
              <div className={styles.skeletonLabel} style={{ width: '50px' }}></div>
              <div className={styles.skeletonInput}></div>
            </div>

            {/* Period */}
            <div className={styles.skeletonField}>
              <div className={styles.skeletonLabel} style={{ width: '220px' }}></div>
              <div className={styles.skeletonInput}></div>
            </div>

            {/* Email */}
            <div className={styles.skeletonField}>
              <div className={styles.skeletonLabel} style={{ width: '170px' }}></div>
              <div className={styles.skeletonInput}></div>
            </div>

            {/* Submit Button */}
            <div className={styles.skeletonButton}></div>
          </div>
        </div>
      </div>
    );
  }

  // Error State
  if (fetchError || !formDef) {
    return (
      <div className={styles.errorBox} role="alert">
        <div style={{ fontSize: '28px' }}>⚠️</div>
        <h3 style={{ margin: 0, fontWeight: 700, fontSize: '18px' }}>Form Unavailable</h3>
        <p style={{ margin: 0, color: '#6B7280', fontSize: '14px' }}>
          {fetchError || "We couldn't load the job alert form right now. Please try again later."}
        </p>
        <button type="button" onClick={loadFormDefinition} className={styles.retryBtn}>
          Try Again
        </button>
      </div>
    );
  }

  // Left side criteria: Type of contract & Language (as clean checkboxes)
  const contractField = formDef.fields.find(
    (f) => f.label.toLowerCase().includes('contract') || f.label.toLowerCase().includes('type')
  );
  const languageField = formDef.fields.find((f) =>
    f.label.toLowerCase().includes('language')
  );

  // Right side inputs: Keyword, Branche, Skills, Period, Email
  const brancheField = formDef.fields.find((f) =>
    f.label.toLowerCase().includes('branch')
  );
  const skillField = formDef.fields.find((f) =>
    f.label.toLowerCase().includes('skill')
  );
  const periodField = formDef.fields.find(
    (f) => f.type === 'select' || f.label.toLowerCase().includes('period')
  );
  const emailField = formDef.fields.find((f) => f.type === 'email');

  const leftFields = [contractField, languageField].filter(Boolean) as JobAlertField[];

  // Helper to extract display labels for submitted summary
  const getSelectedLabels = (fieldId: string) => {
    const field = formDef?.fields.find((f) => f.id === fieldId);
    const rawVal = formValues[fieldId];
    if (!field || !field.options || !rawVal) return [];
    const valArray = Array.isArray(rawVal) ? (rawVal as string[]) : [String(rawVal)];
    return valArray
      .map((val) => field.options?.find((o) => o.value === val)?.label || val)
      .filter(Boolean);
  };

  // Success State (Thank You Card)
  if (isSubmittedSuccess) {
    const contractLabels = contractField ? getSelectedLabels(contractField.id) : [];
    const languageLabels = languageField ? getSelectedLabels(languageField.id) : [];
    const brancheLabels = brancheField ? getSelectedLabels(brancheField.id) : [];
    const skillLabels = skillField ? getSelectedLabels(skillField.id) : [];
    const periodLabel = periodField
      ? periodField.options?.find((o) => o.value === formValues[periodField.id])?.label ||
        String(formValues[periodField.id] || 'Weekly')
      : null;

    return (
      <div className={styles.modalCard}>
        <div className={styles.cardHeader}>
          <h2 className={styles.modalTitle}>Create Jobalert</h2>
          <button
            type="button"
            className={styles.closeButton}
            onClick={() => {
              setIsSubmittedSuccess(false);
              initializeValues(formDef.fields);
              if (onClose) onClose();
            }}
            aria-label="Close"
          >
            ×
          </button>
        </div>

        <div className={styles.thankYouCard} role="status">
          <div className={styles.thankYouIconWrapper}>
            <svg
              width="36"
              height="36"
              viewBox="0 0 24 24"
              fill="none"
              stroke="#EA580C"
              strokeWidth="2.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <polyline points="20 6 9 17 4 12" />
            </svg>
          </div>

          <h3 className={styles.thankYouTitle}>Thank You!</h3>
          <p className={styles.thankYouSubtitle}>
            Your Job Alert has been successfully activated.
          </p>

          <div className={styles.thankYouDetailsBox}>
            <div className={styles.thankYouEmailRow}>
              <span className={styles.thankYouEmailLabel}>Alerts will be sent to:</span>
              <span className={styles.thankYouEmailValue}>{submittedEmail || 'your email'}</span>
            </div>

            {(contractLabels.length > 0 ||
              languageLabels.length > 0 ||
              brancheLabels.length > 0 ||
              skillLabels.length > 0) && (
              <div className={styles.thankYouSummarySection}>
                <span className={styles.thankYouSummaryLabel}>Selected Preferences:</span>
                <div className={styles.thankYouChips}>
                  {contractLabels.map((l) => (
                    <span key={l} className={styles.thankYouChip}>
                      <FileText size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {l}
                    </span>
                  ))}
                  {languageLabels.map((l) => (
                    <span key={l} className={styles.thankYouChip}>
                      <Globe size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {l}
                    </span>
                  ))}
                  {brancheLabels.map((l) => (
                    <span key={l} className={styles.thankYouChip}>
                      <Building2 size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {l}
                    </span>
                  ))}
                  {skillLabels.map((l) => (
                    <span key={l} className={styles.thankYouChip}>
                      <Sparkles size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {l}
                    </span>
                  ))}
                  {periodLabel && (
                    <span className={styles.thankYouChip}>
                      <Calendar size={12} style={{ display: 'inline', marginRight: 4, verticalAlign: 'middle' }} />
                      {periodLabel}
                    </span>
                  )}
                </div>
              </div>
            )}

            <p className={styles.thankYouNotice}>
              You will receive email notifications as soon as newly posted positions match your selected criteria. You can change your preferences or unsubscribe anytime directly through the emails.
            </p>
          </div>

          <div className={styles.thankYouActions}>
            <button
              type="button"
              onClick={() => {
                setIsSubmittedSuccess(false);
                initializeValues(formDef.fields);
                if (onClose) onClose();
              }}
              className={styles.thankYouDoneBtn}
            >
              Done
            </button>
            <button
              type="button"
              onClick={() => {
                setIsSubmittedSuccess(false);
                initializeValues(formDef.fields);
              }}
              className={styles.thankYouNewAlertBtn}
            >
              Create Another Alert
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.modalCard}>
      {/* Top Header with Title & Close button */}
      <div className={styles.cardHeader}>
        <h2 className={styles.modalTitle}>Create Jobalert</h2>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => {
            initializeValues(formDef.fields);
            if (onClose) onClose();
          }}
          aria-label="Close"
        >
          ×
        </button>
      </div>

      {submitError && (
        <div className={styles.submitErrorBanner} role="alert">
          {submitError}
        </div>
      )}

      <form onSubmit={handleSubmit} noValidate>
        <div className={styles.formBody}>
          {/* LEFT SIDE: Checkboxes (Type of contract, Language) */}
          <div className={styles.criteriaSection}>
            {leftFields.map((field) => (
              <CriteriaCheckboxGroup
                key={field.id}
                field={field}
                selectedValues={(formValues[field.id] as string[]) || []}
                error={errors[field.id]}
                isExpanded={Boolean(expandedFields[field.id])}
                filterText={searchFilter[field.id] || ''}
                onToggle={(val) => handleCheckboxToggle(field.id, val)}
                onToggleExpand={() => toggleExpand(field.id)}
                onFilterChange={(txt) =>
                  setSearchFilter((prev) => ({ ...prev, [field.id]: txt }))
                }
              />
            ))}
          </div>

          {/* RIGHT SIDE: Inputs (Keyword, Branche, Skills, Period, Email, Submit Button) */}
          <div className={styles.inputsSection}>
            {/* 1. Keyword Input */}
            <div className={styles.inputGroup}>
              <label htmlFor="jobalert-keyword" className={styles.inputLabel}>
                Keyword
              </label>
              <div className={styles.inputWithIcon}>
                <span className={styles.fieldIcon} aria-hidden="true">
                  <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20.59 13.41l-7.17 7.17a2 2 0 0 1-2.83 0L2 12V2h10l8.59 8.59a2 2 0 0 1 0 2.82z"></path>
                    <line x1="7" y1="7" x2="7.01" y2="7"></line>
                  </svg>
                </span>
                <input
                  id="jobalert-keyword"
                  type="text"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder="Search jobs by keyword"
                  className={styles.textInput}
                />
              </div>
            </div>

            {/* 2. Branche Input (Searchable Multiselect) */}
            {brancheField && (
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Branche
                  {brancheField.required && (
                    <span className={styles.requiredAsterisk} aria-hidden="true">
                      *
                    </span>
                  )}
                </label>
                <SearchableInputDropdown
                  id={`field-${brancheField.id}`}
                  icon={
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect>
                      <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path>
                    </svg>
                  }
                  placeholder="Select branche..."
                  options={brancheField.options || []}
                  selectedValues={(formValues[brancheField.id] as string[]) || []}
                  hasError={!!errors[brancheField.id]}
                  onToggle={(val) => handleCheckboxToggle(brancheField.id, val)}
                  onRemove={(val) => handleCheckboxToggle(brancheField.id, val)}
                />
                {errors[brancheField.id] && (
                  <span className={styles.errorText} role="alert">
                    {errors[brancheField.id]}
                  </span>
                )}
              </div>
            )}

            {/* 3. Skills Input (Searchable Multiselect) */}
            {skillField && (
              <div className={styles.inputGroup}>
                <label className={styles.inputLabel}>
                  Skills
                  {skillField.required && (
                    <span className={styles.requiredAsterisk} aria-hidden="true">
                      *
                    </span>
                  )}
                </label>
                <SearchableInputDropdown
                  id={`field-${skillField.id}`}
                  icon={
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"></polygon>
                    </svg>
                  }
                  placeholder="Select skills..."
                  options={skillField.options || []}
                  selectedValues={(formValues[skillField.id] as string[]) || []}
                  hasError={!!errors[skillField.id]}
                  onToggle={(val) => handleCheckboxToggle(skillField.id, val)}
                  onRemove={(val) => handleCheckboxToggle(skillField.id, val)}
                />
                {errors[skillField.id] && (
                  <span className={styles.errorText} role="alert">
                    {errors[skillField.id]}
                  </span>
                )}
              </div>
            )}

            {/* 4. How often do you wish to receive vacancies? (Period with Calendar Icon) */}
            {periodField && (
              <div className={styles.inputGroup}>
                <label htmlFor={`field-${periodField.id}`} className={styles.inputLabel}>
                  How often do you wish to receive vacancies?
                  {periodField.required && (
                    <span className={styles.requiredAsterisk} aria-hidden="true">
                      *
                    </span>
                  )}
                </label>
                <div className={styles.inputWithIcon}>
                  <span className={styles.fieldIcon} aria-hidden="true">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect>
                      <line x1="16" y1="2" x2="16" y2="6"></line>
                      <line x1="8" y1="2" x2="8" y2="6"></line>
                      <line x1="3" y1="10" x2="21" y2="10"></line>
                    </svg>
                  </span>
                  <select
                    id={`field-${periodField.id}`}
                    name={periodField.name}
                    value={String(formValues[periodField.id] || '')}
                    onChange={(e) => handleFieldChange(periodField.id, e.target.value)}
                    required={periodField.required}
                    aria-required={periodField.required}
                    aria-invalid={!!errors[periodField.id]}
                    className={`${styles.selectInput} ${errors[periodField.id] ? styles.inputError : ''}`}
                  >
                    {!periodField.required && <option value="">Select frequency</option>}
                    {periodField.options?.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>
                {errors[periodField.id] && (
                  <span className={styles.errorText} role="alert">
                    {errors[periodField.id]}
                  </span>
                )}
              </div>
            )}

            {/* 5. What is your email address? (Email with Envelope Icon) */}
            {emailField && (
              <div className={styles.inputGroup}>
                <label htmlFor={`field-${emailField.id}`} className={styles.inputLabel}>
                  What is your email address?
                  {emailField.required && (
                    <span className={styles.requiredAsterisk} aria-hidden="true">
                      *
                    </span>
                  )}
                </label>
                <div className={styles.inputWithIcon}>
                  <span className={styles.fieldIcon} aria-hidden="true">
                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
                      <polyline points="22,6 12,13 2,6"></polyline>
                    </svg>
                  </span>
                  <input
                    id={`field-${emailField.id}`}
                    name={emailField.name}
                    type="email"
                    value={String(formValues[emailField.id] || '')}
                    onChange={(e) => handleFieldChange(emailField.id, e.target.value)}
                    placeholder="E-mail address"
                    required={emailField.required}
                    aria-required={emailField.required}
                    aria-invalid={!!errors[emailField.id]}
                    className={`${styles.textInput} ${errors[emailField.id] ? styles.inputError : ''}`}
                  />
                </div>
                {errors[emailField.id] && (
                  <span className={styles.errorText} role="alert">
                    {errors[emailField.id]}
                  </span>
                )}
              </div>
            )}

            {/* 6. Orange Pill Submit Button */}
            <div className={styles.actionRow}>
              <button
                type="submit"
                disabled={isSubmitting}
                className={styles.orangeSubmitBtn}
              >
                {isSubmitting ? (
                  <span>Creating...</span>
                ) : (
                  <span>Create Jobalert</span>
                )}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
}

// ============================================================================
// CHECKBOX LIST GROUP WITH SHOW MORE / SHOW LESS & OPTIONAL FILTER
// ============================================================================

interface CriteriaCheckboxGroupProps {
  field: JobAlertField;
  selectedValues: string[];
  error?: string;
  isExpanded: boolean;
  filterText: string;
  onToggle: (value: string) => void;
  onToggleExpand: () => void;
  onFilterChange: (text: string) => void;
}

function CriteriaCheckboxGroup({
  field,
  selectedValues,
  error,
  isExpanded,
  filterText,
  onToggle,
  onToggleExpand,
  onFilterChange,
}: CriteriaCheckboxGroupProps) {
  const options = field.options || [];
  const INITIAL_VISIBLE_COUNT = 5;
  const hasMany = options.length > INITIAL_VISIBLE_COUNT;

  // Friendly title mapping
  let displayTitle = field.label;
  const lower = displayTitle.toLowerCase();
  if (lower === 'contract type' || lower.includes('contract')) {
    displayTitle = 'Type of contract';
  } else if (lower.includes('branche') || lower.includes('branch')) {
    displayTitle = 'Branche';
  } else if (lower.includes('skill')) {
    displayTitle = 'Skills';
  } else if (lower.includes('language')) {
    displayTitle = 'Language';
  }

  // Filter options if expanded and user typed in search
  const filtered = filterText.trim()
    ? options.filter((opt) =>
        opt.label.toLowerCase().includes(filterText.toLowerCase().trim())
      )
    : options;

  const visibleOptions = isExpanded
    ? filtered
    : options.slice(0, INITIAL_VISIBLE_COUNT);

  return (
    <div className={styles.criteriaGroup}>
      <div className={styles.groupTitle}>
        <span>{displayTitle}</span>
      </div>

      {/* Optional Search Filter when expanded for lists with many items */}
      {isExpanded && options.length > 10 && (
        <div className={styles.filterSearchBox}>
          <input
            type="text"
            value={filterText}
            onChange={(e) => onFilterChange(e.target.value)}
            placeholder={`Filter ${displayTitle.toLowerCase()}...`}
            className={styles.filterSearchInput}
          />
        </div>
      )}

      {/* Checkbox Items */}
      <div className={styles.checkboxList}>
        {visibleOptions.map((opt) => {
          const isChecked = selectedValues.includes(opt.value);
          return (
            <label key={opt.value} className={styles.checkboxItem}>
              <input
                type="checkbox"
                checked={isChecked}
                onChange={() => onToggle(opt.value)}
                className={styles.hiddenInput}
              />
              <span
                className={`${styles.customCheckbox} ${
                  isChecked ? styles.customCheckboxChecked : ''
                }`}
                aria-hidden="true"
              >
                {isChecked && (
                  <svg
                    className={styles.checkIcon}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                  >
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                )}
              </span>
              <span className={styles.checkboxLabel}>{opt.label}</span>
            </label>
          );
        })}
      </div>

      {/* Show more / Show less toggle */}
      {hasMany && (
        <button
          type="button"
          onClick={onToggleExpand}
          className={styles.showMoreBtn}
          aria-expanded={isExpanded}
        >
          <span className={styles.showMoreIcon} aria-hidden="true">
            {isExpanded ? '−' : '+'}
          </span>
          <span>
            {isExpanded ? 'Show less' : `Show more`}
          </span>
        </button>
      )}

      {error && (
        <span className={styles.errorText} role="alert">
          {error}
        </span>
      )}
    </div>
  );
}

// ============================================================================
// SEARCHABLE INPUT DROPDOWN (FOR BRANCHE & SKILLS AS INPUTS)
// ============================================================================

interface SearchableInputDropdownProps {
  id: string;
  icon: React.ReactNode;
  placeholder: string;
  options: JobAlertFieldOption[];
  selectedValues: string[];
  hasError?: boolean;
  onToggle: (value: string) => void;
  onRemove: (value: string) => void;
}

function SearchableInputDropdown({
  id,
  icon,
  placeholder,
  options,
  selectedValues,
  hasError,
  onToggle,
  onRemove,
}: SearchableInputDropdownProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const containerRef = React.useRef<HTMLDivElement>(null);
  const searchInputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleOutsideClick);
    }
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
    };
  }, [isOpen]);

  React.useEffect(() => {
    if (isOpen && searchInputRef.current) {
      searchInputRef.current.focus();
    }
  }, [isOpen]);

  const selectedOptions = options.filter((o) => selectedValues.includes(o.value));
  const filteredOptions = options.filter((o) =>
    o.label.toLowerCase().includes(searchTerm.toLowerCase().trim())
  );

  return (
    <div ref={containerRef} className={styles.searchableInputContainer}>
      <div
        id={id}
        tabIndex={0}
        role="combobox"
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        onClick={() => setIsOpen(!isOpen)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            setIsOpen(!isOpen);
          }
        }}
        className={`${styles.searchableInputTrigger} ${
          isOpen ? styles.searchableInputTriggerOpen : ''
        } ${hasError ? styles.inputError : ''}`}
      >
        <span className={styles.fieldIcon} aria-hidden="true">
          {icon}
        </span>

        <div className={styles.inputChips}>
          {selectedOptions.length === 0 ? (
            <span className={styles.inputPlaceholder}>{placeholder}</span>
          ) : (
            <>
              {selectedOptions.slice(0, 2).map((opt) => (
                <span key={opt.value} className={styles.inputChip} title={opt.label}>
                  <span className={styles.chipText}>{opt.label}</span>
                  <button
                    type="button"
                    aria-label={`Remove ${opt.label}`}
                    onClick={(e) => {
                      e.stopPropagation();
                      onRemove(opt.value);
                    }}
                    className={styles.inputChipRemove}
                  >
                    ×
                  </button>
                </span>
              ))}

              {selectedOptions.length > 2 && (
                <span
                  className={styles.moreBadge}
                  title={selectedOptions
                    .slice(2)
                    .map((o) => o.label)
                    .join(', ')}
                >
                  +{selectedOptions.length - 2} more
                </span>
              )}
            </>
          )}
        </div>

        <span
          className={`${styles.triggerArrow} ${
            isOpen ? styles.triggerArrowOpen : ''
          }`}
          aria-hidden="true"
        >
          ▼
        </span>
      </div>

      {isOpen && (
        <div className={styles.inputDropdownMenu}>
          <div className={styles.dropdownSearchWrapper}>
            <input
              ref={searchInputRef}
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search..."
              className={styles.dropdownSearchInput}
              onClick={(e) => e.stopPropagation()}
            />
          </div>

          <ul className={styles.dropdownList} role="listbox" aria-multiselectable="true">
            {filteredOptions.length === 0 ? (
              <li className={styles.dropdownNoOptions}>No matching options</li>
            ) : (
              filteredOptions.map((opt) => {
                const isChecked = selectedValues.includes(opt.value);
                return (
                  <li
                    key={opt.value}
                    role="option"
                    aria-selected={isChecked}
                    onClick={() => onToggle(opt.value)}
                    className={`${styles.dropdownOption} ${
                      isChecked ? styles.dropdownOptionSelected : ''
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={isChecked}
                      readOnly
                      className={styles.dropdownCheckbox}
                      aria-hidden="true"
                    />
                    <span>{opt.label}</span>
                  </li>
                );
              })
            )}
          </ul>
        </div>
      )}
    </div>
  );
}

