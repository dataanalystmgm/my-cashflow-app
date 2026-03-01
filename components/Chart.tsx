"use client"
import { 
  AreaChart, Area, XAxis, YAxis, CartesianGrid, 
  Tooltip, ResponsiveContainer, BarChart, Bar, Cell 
} from 'recharts';

interface ChartProps {
  data: any[];
}

export default function CashFlowChart({ data }: ChartProps) {
  // Mengolah data untuk chart (Pemasukan vs Pengeluaran)
  const chartData = [
    {
      name: 'Pemasukan',
      amount: data.filter(t => t.type === 'income').reduce((acc, curr) => acc + curr.amount, 0),
      color: '#22c55e' // Green-500
    },
    {
      name: 'Pengeluaran',
      amount: data.filter(t => t.type === 'expense').reduce((acc, curr) => acc + curr.amount, 0),
      color: '#ef4444' // Red-500
    }
  ];

  return (
    <div className="w-full h-64 mt-4">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f3f4f6" />
          <XAxis 
            dataKey="name" 
            axisLine={false} 
            tickLine={false} 
            tick={{ fill: '#9ca3af', fontSize: 12 }} 
          />
          <YAxis hide />
          <Tooltip 
            cursor={{ fill: '#f9fafb' }}
            contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
          />
          <Bar dataKey="amount" radius={[8, 8, 0, 0]} barSize={50}>
            {chartData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color} />
            ))}
          </Bar>
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}