import { createLazyComponent } from '../utils/lazyLoading'
import type { TutorialModalProps } from './TutorialModal'

// Lazy load the TutorialModal component
export const LazyTutorialModal = createLazyComponent<React.ComponentType<TutorialModalProps>>(
  () => import('./TutorialModal'),
  'Loading tutorial...'
)

export default LazyTutorialModal
