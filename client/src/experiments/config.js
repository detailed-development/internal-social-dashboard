export const VARIANT_CONFIG = {
  layout: {
    label: 'Layout Style',
    defaultValue: 'default',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'split-rail', label: 'Split Rail' },
      { value: 'soft-workspace', label: 'Soft Workspace' },
      { value: 'contextual', label: 'Contextual' },
    ],
  },
  clientDashboard: {
    label: 'Client Dashboard',
    defaultValue: 'default',
    options: [
      { value: 'default', label: 'Default' },
      { value: 'v2', label: 'Prototype 2' },
      { value: 'v3', label: 'Prototype 3' },
    ],
  },
  messages: {
    label: 'Messages',
    description: 'Choose which message thread UI to use',
    defaultValue: 'default',
    requiresRefresh: false,
    options: [
        { value: 'default', label: 'Default' },
        { value: 'compact', label: 'Compact' },
        { value: 'threaded', label: 'Threaded' },
    ],
  },
}