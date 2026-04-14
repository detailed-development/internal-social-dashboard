import { useFeatureFlags } from '../experiments/useFeatureFlags'

import LayoutDefault from './Layouts/LayoutDefault'
import LayoutSplitRail from './Layouts/LayoutSplitRail'
import LayoutSoftWorkspace from './Layouts/LayoutSoftWorkspace'
import LayoutContextual from './Layouts/LayoutContextual'

export default function Layout() {
  const { getVariant } = useFeatureFlags()
  const layoutVariant = getVariant('layout')

  switch (layoutVariant) {
    case 'split-rail':
      return <LayoutSplitRail />
    case 'soft-workspace':
      return <LayoutSoftWorkspace />
    case 'contextual':
      return <LayoutContextual />
    default:
      return <LayoutDefault />
  }
}