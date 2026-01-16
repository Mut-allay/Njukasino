import { createLazyComponent } from '../utils/lazyLoading'
import type { GameOverModalProps } from './GameOverModal'

// Lazy load the GameOverModal component
export const LazyGameOverModal = createLazyComponent<React.ComponentType<GameOverModalProps>>(
  () => import('./GameOverModal'),
  'Loading game results...'
)

export default LazyGameOverModal
