/**
 * Lazy Loading Utilities
 * 
 * Provides utilities for lazy loading components and managing loading states
 * to improve initial bundle size and performance.
 */

import React, { lazy, Suspense } from 'react'
import type { ComponentType } from 'react'
import LoadingOverlay from '../components/LoadingOverlay'

/**
 * Create a lazy component with error boundary and loading fallback
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackMessage: string = 'Loading...'
): T {
  const LazyComponent = lazy(importFn)
  
  return function LazyWrapper(props: React.ComponentProps<T>) {
    return (
      <Suspense 
        fallback={
          <LoadingOverlay 
            isVisible={true} 
            message={fallbackMessage}
            showSpinner={true}
          />
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    )
  } as T
}

/**
 * Preload a component for faster subsequent loads
 */
export function preloadComponent(importFn: () => Promise<unknown>) {
  return () => {
    importFn()
  }
}

/**
 * Lazy load with retry mechanism
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLazyComponentWithRetry<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  maxRetries: number = 3,
  fallbackMessage: string = 'Loading...'
): T {
  const LazyComponent = lazy(() => 
    retryImport(importFn, maxRetries)
  )
  
  return function LazyWrapperWithRetry(props: React.ComponentProps<T>) {
    return (
      <Suspense 
        fallback={
          <LoadingOverlay 
            isVisible={true} 
            message={fallbackMessage}
            showSpinner={true}
          />
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    )
  } as T
}

/**
 * Retry import with exponential backoff
 */
async function retryImport<T>(
  importFn: () => Promise<T>,
  maxRetries: number,
  currentRetry: number = 0
): Promise<T> {
  try {
    return await importFn()
  } catch (error) {
    if (currentRetry < maxRetries) {
      const delay = Math.pow(2, currentRetry) * 1000 // Exponential backoff
      await new Promise(resolve => setTimeout(resolve, delay))
      return retryImport(importFn, maxRetries, currentRetry + 1)
    }
    throw error
  }
}

/**
 * Lazy load with intersection observer for viewport-based loading
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function createLazyComponentWithIntersection<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  fallbackMessage: string = 'Loading...',
  rootMargin: string = '50px'
): T {
  const LazyComponent = lazy(importFn)
  
  return function LazyWrapperWithIntersection(props: React.ComponentProps<T>) {
    const [isVisible, setIsVisible] = React.useState(false)
    const [hasLoaded, setHasLoaded] = React.useState(false)
    const ref = React.useRef<HTMLDivElement>(null)
    
    React.useEffect(() => {
      const observer = new IntersectionObserver(
        ([entry]) => {
          if (entry.isIntersecting && !hasLoaded) {
            setIsVisible(true)
            setHasLoaded(true)
          }
        },
        { rootMargin }
      )
      
      if (ref.current) {
        observer.observe(ref.current)
      }
      
      return () => observer.disconnect()
    }, [hasLoaded])
    
    if (!isVisible) {
      return <div ref={ref} style={{ minHeight: '200px' }} />
    }
    
    return (
      <Suspense 
        fallback={
          <LoadingOverlay 
            isVisible={true} 
            message={fallbackMessage}
            showSpinner={true}
          />
        }
      >
        <LazyComponent {...props} />
      </Suspense>
    )
  } as T
}

