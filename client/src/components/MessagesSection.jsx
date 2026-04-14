import { useFeatureFlags } from '../experiments/useFeatureFlags'

import MessagesSectionDefault from './Messages/MessagesSectionDefault'
import MessagesSectionCompact from './Messages/MessagesSectionCompact'
import MessagesSectionThreaded from './Messages/MessagesSectionThreaded'

export default function MessagesSection(props) {
  const { getVariant } = useFeatureFlags()
  const variant = getVariant('messages')

  switch (variant) {
    case 'compact':
      return <MessagesSectionCompact {...props} />
    case 'threaded':
      return <MessagesSectionThreaded {...props} />
    default:
      return <MessagesSectionDefault {...props} />
  }
}