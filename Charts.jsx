import {
  Area, AreaChart, CartesianGrid, Cell, Line, LineChart, Pie, PieChart, ResponsiveContainer,
  Tooltip, XAxis, YAxis,
} from 'recharts';
import { categoryColor, money } from '../utils/format.js';

const axisStyle = { fill: '#9aa3b2', fontSize: 11 };
const tooltipStyle = { borderRadius: 10, border: '1px solid #e8ebf1', boxShadow: '0 8px 24px #17255412' };

export function DashboardSpendingChart({ data, currency }) {
  return (
    <ResponsiveContainer width="100%" height={230}>
      <AreaChart data={data} margin={{ left: 0, right: 12, top: 10, bottom: 0 }}>
        <defs>
          <linearGradient id="dashboardFill" x1="0" x2="0" y1="0" y2="1">
            <stop offset="0" stopColor="#4678ef" stopOpacity={0.16} />
            <stop offset="1" stopColor="#4678ef" stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid vertical={false} stroke="#edf0f5" />
        <XAxis dataKey="day" tickLine={false} axisLine={false} tick={axisStyle} dy={10} />
        <YAxis tickLine={false} axisLine={false} tick={axisStyle} tickFormatter={(value) => `${currency === 'PHP' ? '₱' : ''}${value}`} width={45} />
        <Tooltip formatter={(value) => money(value, currency)} contentStyle={tooltipStyle} />
        <Area dataKey="amount" type="monotone" stroke="#4b7df1" strokeWidth={2.5} fill="url(#dashboardFill)" activeDot={{ r: 5 }} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function DashboardCategoryChart({ categories, currency, topCategory }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={170}>
        <PieChart>
          <Pie data={categories} dataKey="value" nameKey="name" innerRadius={55} outerRadius={76} paddingAngle={3} stroke="none">
            {categories.map((entry) => <Cell key={entry.name} fill={categoryColor(entry.name)} />)}
          </Pie>
          <Tooltip formatter={(value) => money(value, currency)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center"><small>TOP CATEGORY</small><b>{topCategory}</b></div>
    </>
  );
}

export function ReportTrendChart({ data, currency }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <LineChart data={data} margin={{ left: 8, right: 12, top: 14, bottom: 0 }}>
        <CartesianGrid vertical={false} stroke="#edf0f5" />
        <XAxis dataKey="label" tickLine={false} axisLine={false} tick={axisStyle} dy={8} />
        <YAxis tickLine={false} axisLine={false} tick={axisStyle} width={45} tickFormatter={(value) => `${currency === 'PHP' ? '₱' : ''}${value}`} />
        <Tooltip formatter={(value) => money(value, currency)} />
        <Line dataKey="amount" type="monotone" stroke="#4b7df1" strokeWidth={2.5} dot={{ r: 3, fill: '#4b7df1', strokeWidth: 0 }} activeDot={{ r: 5 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ReportDonutChart({ data, currency, total }) {
  return (
    <>
      <ResponsiveContainer width="100%" height={196}>
        <PieChart>
          <Pie data={data} dataKey="value" nameKey="name" innerRadius={58} outerRadius={82} paddingAngle={3} stroke="none">
            {data.map((item) => <Cell key={item.name} fill={categoryColor(item.name)} />)}
          </Pie>
          <Tooltip formatter={(value) => money(value, currency)} />
        </PieChart>
      </ResponsiveContainer>
      <div className="donut-center report-donut-center"><b>{money(total, currency)}</b><small>TOTAL SPENT</small></div>
    </>
  );
}
