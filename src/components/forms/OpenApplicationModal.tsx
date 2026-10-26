'use client';

import React, { useState, useEffect, useRef } from 'react';
import { UploadCloud, X, CheckCircle2, AlertCircle, FileText, Trash2 } from 'lucide-react';
import { Loader } from '@/components/common/Loader';
import styles from './OpenApplicationModal.module.css';

interface OpenApplicationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function OpenApplicationModal({ isOpen, onClose }: OpenApplicationModalProps) {
  const [formId, setFormId] = useState<string | number>(1356393);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [agreedToTerms, setAgreedToTerms] = useState(false);
  const [cvFile, setCvFile] = useState<File | null>(null);

  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  // Fetch form definition on mount/open to ensure valid formId
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    async function loadFormDef() {
      try {
        const res = await fetch('/api/open_application');
        if (res.ok) {
          const data = await res.json();
          if (data && data.id && isMounted) {
            setFormId(data.id);
          }
        }
      } catch (err) {
        console.warn('Could not load dynamic open application form definition, using default ID:', err);
      }
    }

    loadFormDef();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Reset state when closed
  const handleClose = () => {
    onClose();
    setTimeout(() => {
      setFirstName('');
      setLastName('');
      setPhone('');
      setEmail('');
      setAgreedToTerms(false);
      setCvFile(null);
      setIsSuccess(false);
      setFormError(null);
      setIsSubmitting(false);
    }, 250);
  };

  // Drag and drop handlers
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      validateAndSetFile(file);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      validateAndSetFile(e.target.files[0]);
    }
  };

  const validateAndSetFile = (file: File) => {
    const validExtensions = ['.pdf', '.doc', '.docx'];
    const lowerName = file.name.toLowerCase();
    const isValid = validExtensions.some((ext) => lowerName.endsWith(ext));

    if (!isValid) {
      setFormError('Please upload a valid CV file (.pdf, .doc, or .docx).');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      setFormError('File size exceeds the 10 MB limit. Please select a smaller document.');
      return;
    }

    setFormError(null);
    setCvFile(file);
  };

  const removeFile = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCvFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  // Form submit handler
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!firstName.trim()) {
      setFormError('First name is required.');
      return;
    }
    if (!lastName.trim()) {
      setFormError('Last name is required.');
      return;
    }
    if (!phone.trim()) {
      setFormError('Phone number is required.');
      return;
    }
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }
    if (!cvFile) {
      setFormError('Please upload your CV before submitting.');
      return;
    }
    if (!agreedToTerms) {
      setFormError('Please agree with the privacy conditions before submitting.');
      return;
    }

    try {
      setIsSubmitting(true);

      // 1. Upload CV to /api/files
      const fileFormData = new FormData();
      fileFormData.append('file', cvFile);

      const fileResponse = await fetch('/api/files', {
        method: 'POST',
        body: fileFormData,
      });

      const fileData = await fileResponse.json().catch(() => ({}));
      if (!fileResponse.ok) {
        throw new Error(fileData?.error || 'Failed to upload CV. Please try again.');
      }

      const fileId = Array.isArray(fileData) ? fileData[0]?.id : fileData?.id;
      const owsFileUid = fileData?.owsFileUid || null;

      // 2. Submit Open Application to /api/open_application/[id]
      const submitResponse = await fetch(`/api/open_application/${formId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: firstName.trim(),
          lastName: lastName.trim(),
          email: email.trim(),
          phone: phone.trim(),
          fileId: fileId ? String(fileId) : undefined,
          owsFileUid,
        }),
      });

      const submitData = await submitResponse.json().catch(() => ({}));

      if (!submitResponse.ok) {
        throw new Error(
          submitData?.error || 'Submission failed. Please check your information and try again.'
        );
      }

      setIsSuccess(true);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Something went wrong. Please try again.';
      setFormError(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div
      className={styles.modalBackdrop}
      onClick={handleClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="open-app-modal-title"
    >
      <div
        className={styles.modalCard}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className={styles.modalHeader}>
          <h2 id="open-app-modal-title" className={styles.modalTitle}>
            Open application
          </h2>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={handleClose}
            aria-label="Close modal"
          >
            <X size={22} />
          </button>
        </div>

        {/* Modal Content */}
        {isSuccess ? (
          <div className={styles.successContainer}>
            <div className={styles.successIconWrapper}>
              <CheckCircle2 size={36} />
            </div>
            <h3 className={styles.successTitle}>Application Submitted!</h3>
            <p className={styles.successMessage}>
              Thank you, <strong>{firstName}</strong>. We have received your open application. Our recruitment team will review your profile and match you with relevant projects.
            </p>
            <button
              type="button"
              className={styles.successCloseBtn}
              onClick={handleClose}
            >
              Done
            </button>
          </div>
        ) : (
          <form className={styles.formBody} onSubmit={handleSubmit} noValidate>
            {formError && (
              <div className={styles.alertBanner} role="alert">
                <AlertCircle size={18} style={{ flexShrink: 0 }} />
                <span>{formError}</span>
              </div>
            )}

            <div className={styles.gridColumns}>
              {/* Left Column: Form Fields */}
              <div className={styles.leftCol}>
                <div className={styles.nameRow}>
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      placeholder="First name *"
                      value={firstName}
                      onChange={(e) => setFirstName(e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                  <div className={styles.inputGroup}>
                    <input
                      type="text"
                      placeholder="Last name *"
                      value={lastName}
                      onChange={(e) => setLastName(e.target.value)}
                      className={styles.input}
                      required
                    />
                  </div>
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="tel"
                    placeholder="Phone *"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.inputGroup}>
                  <input
                    type="email"
                    placeholder="Email *"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className={styles.input}
                    required
                  />
                </div>

                <div className={styles.checkboxRow}>
                  <input
                    type="checkbox"
                    id="open-app-terms"
                    checked={agreedToTerms}
                    onChange={(e) => setAgreedToTerms(e.target.checked)}
                    className={styles.checkboxInput}
                  />
                  <label htmlFor="open-app-terms" className={styles.checkboxLabel}>
                    I agree with the privacy conditions.
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={isSubmitting}
                  className={styles.submitBtn}
                >
                  {isSubmitting ? (
                    <Loader variant="button" size="sm" color="white" text="Sending application..." />
                  ) : (
                    'Send application'
                  )}
                </button>
              </div>

              {/* Right Column: Upload CV */}
              <div className={styles.rightCol}>
                <div
                  className={`${styles.uploadBox} ${isDragging ? styles.uploadBoxActive : ''} ${
                    !cvFile && formError && formError.toLowerCase().includes('cv')
                      ? styles.uploadBoxError
                      : ''
                  }`}
                  onDragOver={handleDragOver}
                  onDragLeave={handleDragLeave}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      fileInputRef.current?.click();
                    }
                  }}
                  aria-label="Upload your CV document"
                >
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileChange}
                    accept=".pdf,.doc,.docx"
                    className={styles.hiddenFileInput}
                    tabIndex={-1}
                  />

                  {cvFile ? (
                    <div className={styles.fileCard} onClick={(e) => e.stopPropagation()}>
                      <FileText size={28} color="#2563eb" style={{ flexShrink: 0 }} />
                      <div className={styles.fileCardInfo}>
                        <div className={styles.fileName}>{cvFile.name}</div>
                        <div className={styles.fileSize}>
                          {(cvFile.size / 1024).toFixed(0)} KB • Ready
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.removeFileBtn}
                        onClick={removeFile}
                        title="Remove file"
                        aria-label="Remove uploaded file"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  ) : (
                    <>
                      <UploadCloud size={46} className={styles.cloudIcon} strokeWidth={1.8} />
                      <p className={styles.uploadTitle}>Upload CV</p>
                      <p className={styles.uploadSubtitle}>Drag & Drop or Browse</p>
                      <span className={styles.uploadHint}>PDF, DOC, DOCX up to 10 MB</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

export default OpenApplicationModal;
