import { useTheme } from '../ThemeContext'

const COLORS = {
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  FACEBOOK:  'bg-blue-100 text-blue-700',
  YOUTUBE:   'bg-red-100 text-red-700',
  TIKTOK:    'bg-gray-100 text-gray-700',
  TWITTER:   'bg-sky-100 text-sky-700',
}

const COLORS_DARK = {
  INSTAGRAM: 'bg-pink-900 text-pink-300',
  FACEBOOK:  'bg-blue-900 text-blue-300',
  YOUTUBE:   'bg-red-900 text-red-300',
  TIKTOK:    'bg-gray-700 text-gray-300',
  TWITTER:   'bg-sky-900 text-sky-300',
}

export default function PlatformBadge({ platform }) {
  const { themeKey } = useTheme()
  const palette = themeKey === 'dark' ? COLORS_DARK : COLORS
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${palette[platform] || (themeKey === 'dark' ? 'bg-gray-700 text-gray-300' : 'bg-gray-100 text-gray-600')}`}>
      {platform}
    </span>
  )
}
