import { PieChart, Pie, Cell, Tooltip, ResponsiveContainer } from 'recharts'
import { useTheme } from '../../ThemeContext'

export default function DeviceBreakdownCard({ deviceData, totalDeviceSessions }) {
  const { theme } = useTheme()
  const c = theme.chart
  const deviceColors = [c.line1, c.line2, c.line3, '#f87171']

  if (deviceData.length === 0) {
    return null
  }

  return (
    <div className={`border rounded-xl p-5 ${theme.card}`}>
      <p className={`text-xs font-semibold mb-4 ${theme.subtext}`}>Device Breakdown</p>
      <div className="flex items-center gap-6">
        <ResponsiveContainer width={140} height={140}>
          <PieChart>
            <Pie
              data={deviceData}
              dataKey="sessions"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={35}
              outerRadius={60}
              paddingAngle={2}
            >
              {deviceData.map((_, index) => (
                <Cell key={index} fill={deviceColors[index % deviceColors.length]} />
              ))}
            </Pie>
            <Tooltip contentStyle={{ backgroundColor: c.tooltipBg, borderColor: c.grid }} />
          </PieChart>
        </ResponsiveContainer>

        <div className="space-y-2 flex-1">
          {deviceData.map((device, index) => (
            <div key={device.name} className="flex items-center justify-between text-sm">
              <div className="flex items-center gap-2">
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: deviceColors[index % deviceColors.length] }}
                />
                <span className={theme.body}>{device.name}</span>
              </div>
              <span className={`font-semibold ${theme.heading}`}>
                {totalDeviceSessions
                  ? `${((device.sessions / totalDeviceSessions) * 100).toFixed(0)}%`
                  : '—'}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
