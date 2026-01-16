/**
 * Focus Management Utilities for Accessibility
 * 
 * Provides utilities for managing focus in modals and dialogs to ensure
 * proper keyboard navigation and screen reader support.
 */

export interface FocusTrapOptions {
  /** Element to focus when trap is activated */
  initialFocus?: HTMLElement | null
  /** Whether to restore focus to the previously focused element when trap is deactivated */
  restoreFocus?: boolean
  /** Custom selector for focusable elements within the trap */
  focusableSelector?: string
}

export interface FocusTrap {
  /** Activate the focus trap */
  activate: () => void
  /** Deactivate the focus trap */
  deactivate: () => void
  /** Update the focusable elements (useful for dynamic content) */
  update: () => void
}

/**
 * Default selector for focusable elements
 */
const DEFAULT_FOCUSABLE_SELECTOR = [
  'button:not([disabled])',
  'input:not([disabled])',
  'select:not([disabled])',
  'textarea:not([disabled])',
  'a[href]',
  '[tabindex]:not([tabindex="-1"])',
  '[contenteditable="true"]'
].join(', ')

/**
 * Get all focusable elements within a container
 */
export function getFocusableElements(
  container: HTMLElement,
  selector: string = DEFAULT_FOCUSABLE_SELECTOR
): HTMLElement[] {
  return Array.from(container.querySelectorAll(selector)) as HTMLElement[]
}

/**
 * Get the first focusable element in a container
 */
export function getFirstFocusableElement(
  container: HTMLElement,
  selector: string = DEFAULT_FOCUSABLE_SELECTOR
): HTMLElement | null {
  const focusableElements = getFocusableElements(container, selector)
  return focusableElements[0] || null
}

/**
 * Get the last focusable element in a container
 */
export function getLastFocusableElement(
  container: HTMLElement,
  selector: string = DEFAULT_FOCUSABLE_SELECTOR
): HTMLElement | null {
  const focusableElements = getFocusableElements(container, selector)
  return focusableElements[focusableElements.length - 1] || null
}

/**
 * Create a focus trap for a modal or dialog
 */
export function createFocusTrap(
  container: HTMLElement,
  options: FocusTrapOptions = {}
): FocusTrap {
  const {
    initialFocus,
    restoreFocus = true,
    focusableSelector = DEFAULT_FOCUSABLE_SELECTOR
  } = options

  let previouslyFocusedElement: HTMLElement | null = null
  let isActive = false
  let focusableElements: HTMLElement[] = []

  const updateFocusableElements = () => {
    focusableElements = getFocusableElements(container, focusableSelector)
  }

  const handleKeyDown = (event: KeyboardEvent) => {
    if (!isActive) return

    if (event.key === 'Tab') {
      event.preventDefault()
      
      if (focusableElements.length === 0) return

      const currentIndex = focusableElements.indexOf(document.activeElement as HTMLElement)
      
      if (event.shiftKey) {
        // Shift + Tab: move to previous element
        const previousIndex = currentIndex <= 0 ? focusableElements.length - 1 : currentIndex - 1
        focusableElements[previousIndex]?.focus()
      } else {
        // Tab: move to next element
        const nextIndex = currentIndex >= focusableElements.length - 1 ? 0 : currentIndex + 1
        focusableElements[nextIndex]?.focus()
      }
    } else if (event.key === 'Escape') {
      // Dispatch custom event for escape key handling
      const escapeEvent = new CustomEvent('modal-escape', {
        detail: { container },
        bubbles: true,
        cancelable: true
      })
      container.dispatchEvent(escapeEvent)
    }
  }

  const activate = () => {
    if (isActive) return

    // Store the currently focused element
    previouslyFocusedElement = document.activeElement as HTMLElement

    // Update focusable elements
    updateFocusableElements()

    // Focus the initial element or first focusable element
    const elementToFocus = initialFocus || getFirstFocusableElement(container, focusableSelector)
    if (elementToFocus) {
      elementToFocus.focus()
    }

    // Add event listener
    document.addEventListener('keydown', handleKeyDown)
    isActive = true
  }

  const deactivate = () => {
    if (!isActive) return

    // Remove event listener
    document.removeEventListener('keydown', handleKeyDown)

    // Restore focus to previously focused element
    if (restoreFocus && previouslyFocusedElement) {
      previouslyFocusedElement.focus()
    }

    isActive = false
  }

  const update = () => {
    if (isActive) {
      updateFocusableElements()
    }
  }

  return {
    activate,
    deactivate,
    update
  }
}

/**
 * Hook for managing focus in React components
 */
export function useFocusTrap(
  containerRef: React.RefObject<HTMLElement>,
  options: FocusTrapOptions = {}
) {
  const [focusTrap, setFocusTrap] = React.useState<FocusTrap | null>(null)

  React.useEffect(() => {
    if (!containerRef.current) return

    const trap = createFocusTrap(containerRef.current, options)
    setFocusTrap(trap)

    return () => {
      trap.deactivate()
    }
  }, [options])

  return focusTrap
}

/**
 * Utility to announce content to screen readers
 */
export function announceToScreenReader(message: string, priority: 'polite' | 'assertive' = 'polite') {
  const announcement = document.createElement('div')
  announcement.setAttribute('aria-live', priority)
  announcement.setAttribute('aria-atomic', 'true')
  announcement.className = 'sr-only'
  announcement.style.cssText = `
    position: absolute;
    left: -10000px;
    width: 1px;
    height: 1px;
    overflow: hidden;
  `
  announcement.textContent = message

  document.body.appendChild(announcement)

  // Remove after announcement
  setTimeout(() => {
    document.body.removeChild(announcement)
  }, 1000)
}

/**
 * Utility to check if an element is focusable
 */
export function isFocusable(element: HTMLElement): boolean {
  const focusableElements = getFocusableElements(document.body)
  return focusableElements.includes(element)
}

/**
 * Utility to get the next focusable element in the document
 */
export function getNextFocusableElement(
  currentElement: HTMLElement,
  selector: string = DEFAULT_FOCUSABLE_SELECTOR
): HTMLElement | null {
  const allFocusableElements = getFocusableElements(document.body, selector)
  const currentIndex = allFocusableElements.indexOf(currentElement)
  
  if (currentIndex === -1) return null
  
  return allFocusableElements[currentIndex + 1] || null
}

/**
 * Utility to get the previous focusable element in the document
 */
export function getPreviousFocusableElement(
  currentElement: HTMLElement,
  selector: string = DEFAULT_FOCUSABLE_SELECTOR
): HTMLElement | null {
  const allFocusableElements = getFocusableElements(document.body, selector)
  const currentIndex = allFocusableElements.indexOf(currentElement)
  
  if (currentIndex === -1) return null
  
  return allFocusableElements[currentIndex - 1] || null
}

// Import React for the hook
import React from 'react'
