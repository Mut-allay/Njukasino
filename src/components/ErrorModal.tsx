import React from 'react'
import Modal from './Modal'
import './ErrorModal.css'

export interface ErrorModalProps {
  isOpen: boolean
  onClose: () => void
  title?: string
  message: string
  showRetryButton?: boolean
  onRetry?: () => void
  retryButtonText?: string
}

export const ErrorModal: React.FC<ErrorModalProps> = ({
  isOpen,
  onClose,
  title = 'Error',
  message,
  showRetryButton = false,
  onRetry,
  retryButtonText = 'Retry'
}) => {
  const handleRetry = () => {
    if (onRetry) {
      onRetry()
    }
    onClose()
  }

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={title}
      closeButtonText="OK"
      className="error-modal"
      contentClassName="error-content"
      announceOnOpen={true}
      announcementMessage={`${title}: ${message}`}
    >
      <div className="error-message">
        <div className="error-icon" aria-hidden="true">⚠️</div>
        <p>{message}</p>
      </div>
      
      <div className="error-actions">
        {showRetryButton && onRetry && (
          <button 
            className="error-retry-button"
            onClick={handleRetry}
            autoFocus
          >
            {retryButtonText}
          </button>
        )}
        <button 
          className="error-close-button"
          onClick={onClose}
          autoFocus={!showRetryButton}
        >
          OK
        </button>
      </div>
    </Modal>
  )
}

export default ErrorModal
