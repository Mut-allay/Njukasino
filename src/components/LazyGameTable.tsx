import { createLazyComponent } from '../utils/lazyLoading'
import type { GameTableProps } from './GameTable'

// Lazy load the GameTable component
export const LazyGameTable = createLazyComponent<React.ComponentType<GameTableProps>>(
  () => import('./GameTable'),
  'Loading game table...'
)

export default LazyGameTable
