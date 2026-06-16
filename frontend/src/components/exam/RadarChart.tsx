import {
  RadarChart as ReRadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Legend,
} from 'recharts';

export interface RadarDataItem {
  dimension: string;
  score: number;
  fullMark: number;
}

interface RadarChartProps {
  data: RadarDataItem[];
  className?: string;
}

export default function RadarChart({ data, className }: RadarChartProps) {
  return (
    <div className={className} style={{ width: '100%', height: 320 }}>
      <ResponsiveContainer width="100%" height="100%">
        <ReRadarChart data={data} cx="50%" cy="50%" outerRadius="70%">
          <PolarGrid stroke="#e5e7eb" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fontSize: 12, fill: '#6b7280' }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: '#9ca3af' }}
            tickCount={6}
          />
          <Radar
            name="你的得分"
            dataKey="score"
            stroke="#2563eb"
            fill="#3b82f6"
            fillOpacity={0.25}
            strokeWidth={2}
          />
          <Radar
            name="满分"
            dataKey="fullMark"
            stroke="#d1d5db"
            fill="#f3f4f6"
            fillOpacity={0.1}
            strokeWidth={1.5}
            strokeDasharray="4 4"
          />
          <Legend wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
        </ReRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
