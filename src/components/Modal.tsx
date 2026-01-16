import React, { useEffect, useRef, useCallback } from 'react'
import { createFocusTrap, announceToScreenReader } from '../utils/focusManagement'
import type { FocusTrapOptions } from '../utils/focusManagement'
import './Modal.css'

export interface ModalProps {
  /** Whether the modal is open */
  isOpen: boolean
  /** Function to call when modal should be closed */
  onClose: () => void
  /** Modal title for screen readers */
  title: string
  /** Whether to show the close button */
  showCloseButton?: boolean
  /** Custom close button text */
  closeButtonText?: string
  /** Whether clicking outside closes the modal */
  closeOnOverlayClick?: boolean
  /** Whether pressing Escape closes the modal */
  closeOnEscape?: boolean
  /** Custom CSS class for the modal */
  className?: string
  /** Custom CSS class for the modal content */
  contentClassName?: string
  /** Focus trap options */
  focusTrapOptions?: FocusTrapOptions
  /** Children to render inside the modal */
  children: React.ReactNode
  /** Whether to announce modal opening to screen readers */
  announceOnOpen?: boolean
  /** Custom announcement message */
  announcementMessage?: string
}

export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  showCloseButton = true,
  closeButtonText = 'Close',
  closeOnOverlayClick = true,
  closeOnEscape = true,
  className = '',
  contentClassName = '',
  focusTrapOptions = {},
  children,
  announceOnOpen = true,
  announcementMessage
}) => {
  const modalRef = useRef<HTMLDivElement>(null)
  const focusTrapRef = useRef<ReturnType<typeof createFocusTrap> | null>(null)

  // Create focus trap when modal opens
  useEffect(() => {
    if (isOpen && modalRef.current) {
      focusTrapRef.current = createFocusTrap(modalRef.current, {
        restoreFocus: true,
        ...focusTrapOptions
      })
      focusTrapRef.current.activate()

      // Announce modal opening to screen readers
      if (announceOnOpen) {
        const message = announcementMessage || `${title} dialog opened`
        announceToScreenReader(message, 'polite')
      }
    }

    return () => {
      if (focusTrapRef.current) {
        focusTrapRef.current.deactivate()
        focusTrapRef.current = null
      }
    }
  }, [isOpen, title, announceOnOpen, announcementMessage, focusTrapOptions])

  // Handle escape key
  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if (isOpen && closeOnEscape && event.key === 'Escape') {
      event.preventDefault()
      onClose()
    }
  }, [isOpen, closeOnEscape, onClose])

  // Add escape key listener
  useEffect(() => {
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown)
      return () => document.removeEventListener('keydown', handleKeyDown)
    }
  }, [isOpen, handleKeyDown])

  // Handle overlay click
  const handleOverlayClick = useCallback((event: React.MouseEvent) => {
    if (closeOnOverlayClick && event.target === event.currentTarget) {
      onClose()
    }
  }, [closeOnOverlayClick, onClose])

  // Handle close button click
  const handleCloseClick = useCallback(() => {
    onClose()
  }, [onClose])

  if (!isOpen) return null

  return (
    <div
      className={`modal-overlay ${className}`}
      onClick={handleOverlayClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
      ref={modalRef}
    >
      <div className={`modal-content ${contentClassName}`}>
        <div className="modal-header">
          <h2 id="modal-title" className="modal-title">
            {title}
          </h2>
          {showCloseButton && (
            <button
              type="button"
              className="modal-close-button"
              onClick={handleCloseClick}
              aria-label={`Close ${title} dialog`}
            >
              <span aria-hidden="true">&times;</span>
              <span className="sr-only">{closeButtonText}</span>
            </button>
          )}
        </div>
        <div className="modal-body">
          {children}
        </div>
      </div>
    </div>
  )
}

export default Modal
