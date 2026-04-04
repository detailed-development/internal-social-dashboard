const COLORS = {
  INSTAGRAM: 'bg-pink-100 text-pink-700',
  FACEBOOK:  'bg-blue-100 text-blue-700',
  YOUTUBE:   'bg-red-100 text-red-700',
  TIKTOK:    'bg-gray-100 text-gray-700',
  TWITTER:   'bg-sky-100 text-sky-700',
}

export default function PlatformBadge({ platform }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${COLORS[platform] || 'bg-gray-100 text-gray-600'}`}>
      {platform}
    </span>
  )
}
