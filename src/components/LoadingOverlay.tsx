import React, { useEffect } from 'react'
import { announceToScreenReader } from '../utils/focusManagement'
import './LoadingOverlay.css'

export interface LoadingOverlayProps {
  isVisible: boolean
  message?: string
  showSpinner?: boolean
}

export const LoadingOverlay: React.FC<LoadingOverlayProps> = ({
  isVisible,
  message = 'Loading...',
  showSpinner = true
}) => {
  useEffect(() => {
    if (isVisible) {
      // Announce loading to screen readers
      announceToScreenReader(message, 'polite')
      
      // Prevent body scroll when loading overlay is visible
      document.body.style.overflow = 'hidden'
      
      return () => {
        // Restore body scroll when overlay is hidden
        document.body.style.overflow = 'unset'
      }
    }
  }, [isVisible, message])

  if (!isVisible) return null

  return (
    <div 
      className="loading-overlay"
      role="status"
      aria-live="polite"
      aria-label={message}
    >
      <div className="loading-content">
        {showSpinner && (
          <div className="loading-spinner" aria-hidden="true">
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
            <div className="spinner-ring"></div>
          </div>
        )}
        <p className="loading-message">{message}</p>
      </div>
    </div>
  )
}

export default LoadingOverlay
