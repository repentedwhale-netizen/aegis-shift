"use client";

import {
  Users,
  CalendarClock,
  ShieldCheck,
  TrendingUp,
  Scale,
  Activity,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { PageHeader } from "@/components/shared/page-header";
import { StatCard } from "@/components/shared/stat-card";
import { EmptyState } from "@/components/shared/empty-state";
import { CardSkeleton } from "@/components/shared/loading-skeleton";
import { formatRelativeTime } from "@/lib/utils";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from "recharts";

// Chart data stays mock since it is not backend-driven
const shiftActivityData = [
  { date: "Aug 1", filled: 42, open: 12 },
  { date: "Aug 2", filled: 45, open: 10 },
  { date: "Aug 3", filled: 38, open: 15 },
  { date: "Aug 4", filled: 50, open: 8 },
  { date: "Aug 5", filled: 47, open: 11 },
  { date: "Aug 6", filled: 44, open: 9 },
  { date: "Aug 7", filled: 47, open: 6 },
];

const marketOverview = [
  { name: "Active", value: 12, color: "hsl(221 83% 53%)" },
  { name: "Resolved", value: 45, color: "hsl(142 71% 45%)" },
  { name: "Disputed", value: 3, color: "hsl(38 92% 50%)" },
];

const recentShifts = [
  {
    id: "sh_01",
    title: "ER Night Shift",
    department: "Emergency",
    startTime: new Date(Date.now() + 3600000),
    staffAssigned: 4,
    status: "filled",
  },
  {
    id: "sh_02",
    title: "ICU Weekend Coverage",
    department: "ICU",
    startTime: new Date(Date.now() + 7200000),
    staffAssigned: 2,
    status: "open",
  },
  {
    id: "sh_03",
    title: "Pediatrics Morning",
    department: "Pediatrics",
    startTime: new Date(Date.now() + 10800000),
    staffAssigned: 3,
    status: "filled",
  },
  {
    id: "sh_04",
    title: "Cardiology On-Call",
    department: "Cardiology",
    startTime: new Date(Date.now() + 14400000),
    staffAssigned: 1,
    status: "open",
  },
  {
    id: "sh_05",
    title: "Neurology Overnight",
    department: "Neurology",
    startTime: new Date(Date.now() + 21600000),
    staffAssigned: 2,
    status: "filled",
  },
];

// Mock stats — connected to tRPC at runtime via TRPCProvider
const mockStats = {
  totalStaff: 128,
  activeShifts: 47,
  totalCredentials: 89,
  activeMarkets: 12,
  totalTrades: 1432,
  totalDisputes: 8,
  resolvedDisputes: 6,
};

export default function DashboardPage() {
  const stats = mockStats;
  const isLoading = false;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description="Aegis Shift — Healthcare staffing powered by AI and Web3"
      />

      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
        <StatCard
          title="Total Staff"
          value={stats.totalStaff}
          icon={Users}
          description="registered professionals"
        />
        <StatCard
          title="Active Shifts"
          value={stats.activeShifts}
          icon={CalendarClock}
          description="currently open"
        />
        <StatCard
          title="Credentials"
          value={stats.totalCredentials}
          icon={ShieldCheck}
          description="verified on-chain"
        />
        <StatCard
          title="Active Markets"
          value={stats.activeMarkets}
          icon={TrendingUp}
          description="prediction markets"
        />
        <StatCard
          title="Total Trades"
          value={stats.totalTrades}
          icon={Activity}
          description="this month"
        />
        <StatCard
          title="Disputes"
          value={`${stats.resolvedDisputes}/${stats.totalDisputes}`}
          icon={Scale}
          description="resolved"
        />
      </div>

      {/* Charts Row */}
      <div className="grid gap-4 md:grid-cols-2">
        {/* Shift Activity */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Shift Activity</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={250}>
              <AreaChart data={shiftActivityData}>
                <defs>
                  <linearGradient id="filled" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(221 83% 53%)" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(221 83% 53%)" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                <XAxis dataKey="date" className="text-xs" />
                <YAxis className="text-xs" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
                <Area
                  type="monotone"
                  dataKey="filled"
                  stroke="hsl(221 83% 53%)"
                  fill="url(#filled)"
                  strokeWidth={2}
                  name="Filled Shifts"
                />
                <Area
                  type="monotone"
                  dataKey="open"
                  stroke="hsl(142 71% 45%)"
                  fill="none"
                  strokeWidth={2}
                  name="Open Shifts"
                />
              </AreaChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Market Overview */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Prediction Markets</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center justify-center">
            <ResponsiveContainer width="100%" height={250}>
              <PieChart>
                <Pie
                  data={marketOverview}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {marketOverview.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip
                  contentStyle={{
                    backgroundColor: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: "8px",
                  }}
                />
              </PieChart>
            </ResponsiveContainer>
            <div className="flex flex-col gap-2 ml-4">
              {marketOverview.map((item) => (
                <div key={item.name} className="flex items-center gap-2">
                  <div
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                  <span className="text-sm font-medium ml-auto">{item.value}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Shifts Table */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Recent Shifts</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Shift</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Starts</TableHead>
                <TableHead>Staff</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentShifts.map((shift) => (
                <TableRow key={shift.id}>
                  <TableCell className="font-medium">{shift.title}</TableCell>
                  <TableCell>{shift.department}</TableCell>
                  <TableCell>{formatRelativeTime(shift.startTime)}</TableCell>
                  <TableCell>{shift.staffAssigned}</TableCell>
                  <TableCell>
                    <Badge
                      variant={shift.status === "filled" ? "success" : "warning"}
                    >
                      {shift.status}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
