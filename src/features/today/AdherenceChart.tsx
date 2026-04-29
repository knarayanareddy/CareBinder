import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts';

interface DayData { day: string; taken: number; missed: number }

export function AdherenceChart({ data }: { data: DayData[] }) {
  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-gray-100">
      <h4 className="text-sm font-semibold text-gray-700 mb-3">Dose Adherence</h4>
      <ResponsiveContainer width="100%" height={140}>
        <BarChart data={data} barGap={2}>
          <XAxis dataKey="day" tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} />
          <YAxis hide />
          <Tooltip
            contentStyle={{ fontSize: 12, borderRadius: 8, border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}
            formatter={(v: any, name: any) => [v, name === 'taken' ? 'Taken' : 'Missed']}
          />
          <Bar dataKey="taken" radius={[4, 4, 0, 0]} stackId="a">
            {data.map((_, i) => <Cell key={i} fill="#1B6B4A" />)}
          </Bar>
          <Bar dataKey="missed" radius={[4, 4, 0, 0]} stackId="a">
            {data.map((_, i) => <Cell key={i} fill="#fecaca" />)}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 mt-2 text-xs text-gray-500">
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-[#1B6B4A]" />Taken</span>
        <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-sm bg-red-200" />Missed</span>
      </div>
    </div>
  );
}
