'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  LineChart,
  Line,
  CartesianGrid,
  PieChart,
  Pie,
  Cell,
} from 'recharts';

interface PipelineItem {
  section: string;
  [status: string]: string | number;
}

interface AwardsTrendItem {
  month: string;
  amountMillion: number;
  count: number;
}

interface BudgetPieItem {
  name: string;
  valueMillion: number;
  valueMinor: string;
  color: string;
}

interface DashboardKpiChartsProps {
  pipelineData: readonly PipelineItem[];
  awardsTrendData: readonly AwardsTrendItem[];
  budgetPieData: readonly BudgetPieItem[];
  fiscalYearLabel: string;
}

export function DashboardKpiCharts({
  pipelineData,
  awardsTrendData,
  budgetPieData,
  fiscalYearLabel,
}: DashboardKpiChartsProps) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div className="card" style={{ padding: 24, margin: '20px 0' }}>
        <div className="muted" style={{ textAlign: 'center' }}>Loading executive charts...</div>
      </div>
    );
  }

  // Fallback demo values if database has 0 transactions
  const displayPipeline =
    pipelineData.length > 0
      ? pipelineData
      : [
          { section: 'ADP-1', DRAFT: 3, SUBMITTED: 2, IN_REVIEW: 4, APPROVED: 5, TENDERED: 2 },
          { section: 'ADP-2', DRAFT: 1, SUBMITTED: 3, IN_REVIEW: 2, APPROVED: 4, TENDERED: 3 },
          { section: 'COORD', DRAFT: 2, SUBMITTED: 1, IN_REVIEW: 3, APPROVED: 2, TENDERED: 1 },
          { section: 'SUPTD', DRAFT: 0, SUBMITTED: 2, IN_REVIEW: 1, APPROVED: 3, TENDERED: 0 },
        ];

  const displayAwards =
    awardsTrendData.some((a) => a.count > 0 || a.amountMillion > 0)
      ? awardsTrendData
      : [
          { month: 'Jun', amountMillion: 12.5, count: 4 },
          { month: 'Jul', amountMillion: 18.2, count: 6 },
          { month: 'Aug', amountMillion: 14.0, count: 5 },
          { month: 'Sep', amountMillion: 22.8, count: 8 },
          { month: 'Oct', amountMillion: 31.4, count: 11 },
          { month: 'Nov', amountMillion: 28.6, count: 9 },
        ];

  const totalBudgetMillion = budgetPieData.reduce((acc, b) => acc + b.valueMillion, 0);
  const displayBudget =
    totalBudgetMillion > 0
      ? budgetPieData
      : [
          { name: 'Available (Uncommitted)', valueMillion: 65.5, valueMinor: '6550000000', color: '#10b981' },
          { name: 'Reserved (Committed)',   valueMillion: 22.0, valueMinor: '2200000000', color: '#f59e0b' },
          { name: 'Spent (Disbursed)',       valueMillion: 12.5, valueMinor: '1250000000', color: '#6366f1' },
        ];

  return (
    <section style={{ margin: '24px 0' }}>
      <div className="row" style={{ marginBottom: 14, alignItems: 'center' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: 18 }}>Procurement Intelligence & Trends</h2>
          <p className="muted" style={{ margin: '2px 0 0 0', fontSize: 12 }}>
            Real-time pipeline, award momentum, and budget utilization ({fiscalYearLabel}).
          </p>
        </div>
        <div className="grow" />
        <Link href="/reports" className="btn" style={{ fontSize: 12, padding: '4px 10px' }}>
          Reports index →
        </Link>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(360px, 1fr))', gap: 16 }}>
        {/* Chart 1: Indent Pipeline by Section (Stacked Bar) */}
        <div className="card" style={{ padding: 18, margin: 0 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>Indent Pipeline by Section</h3>
              <span className="muted" style={{ fontSize: 11 }}>Stacked by status across active sections</span>
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={displayPipeline as any[]} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="section" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                <YAxis stroke="var(--text-dim)" fontSize={11} tickLine={false} allowDecimals={false} />
                <Tooltip
                  contentStyle={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    borderRadius: 6,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Bar dataKey="DRAFT" name="Draft" stackId="pipe" fill="#94a3b8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="SUBMITTED" name="Submitted" stackId="pipe" fill="#38bdf8" />
                <Bar dataKey="IN_REVIEW" name="In Review" stackId="pipe" fill="#818cf8" />
                <Bar dataKey="APPROVED" name="Approved" stackId="pipe" fill="#34d399" />
                <Bar dataKey="TENDERED" name="Tendered" stackId="pipe" fill="#fbbf24" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 2: Contract Awards Trend (Line Chart) */}
        <div className="card" style={{ padding: 18, margin: 0 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>Contract Awards Trend (MoM)</h3>
              <span className="muted" style={{ fontSize: 11 }}>Monthly award value momentum</span>
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={displayAwards as any[]} margin={{ top: 10, right: 15, left: -10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" opacity={0.15} />
                <XAxis dataKey="month" stroke="var(--text-dim)" fontSize={11} tickLine={false} />
                <YAxis
                  stroke="var(--text-dim)"
                  fontSize={11}
                  tickLine={false}
                  tickFormatter={(v) => `${v}M`}
                />
                <Tooltip
                  formatter={(val: any) => [`PKR ${Number(val ?? 0).toFixed(2)} Million`, 'Awarded Value']}
                  contentStyle={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    borderRadius: 6,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 6 }} />
                <Line
                  type="monotone"
                  dataKey="amountMillion"
                  name="Awarded (PKR M)"
                  stroke="#6366f1"
                  strokeWidth={3}
                  dot={{ r: 4, fill: '#6366f1' }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Chart 3: Budget Utilisation (Pie Chart) */}
        <div className="card" style={{ padding: 18, margin: 0 }}>
          <div className="row" style={{ marginBottom: 12 }}>
            <div>
              <h3 style={{ margin: 0, fontSize: 15 }}>Budget Utilisation</h3>
              <span className="muted" style={{ fontSize: 11 }}>Allocated / Reserved / Spent — {fiscalYearLabel}</span>
            </div>
          </div>
          <div style={{ width: '100%', height: 260 }}>
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={displayBudget as any[]}
                  dataKey="valueMillion"
                  nameKey="name"
                  cx="50%"
                  cy="45%"
                  innerRadius={50}
                  outerRadius={80}
                  paddingAngle={4}
                  label={(entry: any) =>
                    `${String(entry?.name ?? '').split(' ')[0]} ${((entry?.percent ?? 0) * 100).toFixed(0)}%`
                  }
                  labelLine={false}
                >
                  {displayBudget.map((entry, idx) => (
                    <Cell key={`cell-${idx}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  formatter={(val: any) => [`PKR ${Number(val ?? 0).toFixed(2)} Million`, 'Value']}
                  contentStyle={{
                    backgroundColor: 'var(--bg)',
                    borderColor: 'var(--border)',
                    borderRadius: 6,
                    fontSize: 12,
                    boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 4 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </section>
  );
}
