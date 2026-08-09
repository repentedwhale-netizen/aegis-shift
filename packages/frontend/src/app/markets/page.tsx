"use client";

import { useState } from "react";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { PageHeader } from "@/components/shared/page-header";
import { formatCurrency, formatDate } from "@/lib/utils";

const marketsData = [
  {
    id: "mkt_01",
    question: "Will the ER night shift be fully staffed by 8 PM?",
    status: "active",
    yesShares: 6840,
    noShares: 3257,
    totalLiquidity: 28000,
    closesAt: new Date(Date.now() + 3600000 * 4),
  },
  {
    id: "mkt_02",
    question: "Will ICU require overtime staffing this weekend?",
    status: "active",
    yesShares: 3540,
    noShares: 6512,
    totalLiquidity: 19500,
    closesAt: new Date(Date.now() + 86400000 * 2),
  },
  {
    id: "mkt_03",
    question: "Will cardiology on-call slots reach 80% fill rate?",
    status: "active",
    yesShares: 8100,
    noShares: 1890,
    totalLiquidity: 12000,
    closesAt: new Date(Date.now() + 86400000),
  },
  {
    id: "mkt_04",
    question: "Will the surgery morning block have a staff shortage?",
    status: "active",
    yesShares: 5210,
    noShares: 4780,
    totalLiquidity: 35000,
    closesAt: new Date(Date.now() + 3600000 * 8),
  },
  {
    id: "mkt_05",
    question: "Will pediatrics demand exceed baseline this weekend?",
    status: "resolved",
    yesShares: 9120,
    noShares: 880,
    totalLiquidity: 8500,
    closesAt: new Date(Date.now() - 86400000),
  },
  {
    id: "mkt_06",
    question: "Will neurology need additional on-call coverage next week?",
    status: "active",
    yesShares: 4200,
    noShares: 5800,
    totalLiquidity: 22000,
    closesAt: new Date(Date.now() + 86400000 * 5),
  },
  {
    id: "mkt_07",
    question: "Will the oncology department fill all weekend shifts?",
    status: "active",
    yesShares: 3300,
    noShares: 6750,
    totalLiquidity: 15000,
    closesAt: new Date(Date.now() + 86400000 * 3),
  },
  {
    id: "mkt_08",
    question: "Will anesthesiology staffing meet Q3 targets?",
    status: "resolved",
    yesShares: 7800,
    noShares: 2200,
    totalLiquidity: 31000,
    closesAt: new Date(Date.now() - 86400000 * 10),
  },
  {
    id: "mkt_09",
    question: "Will emergency department run overcapacity tonight?",
    status: "active",
    yesShares: 6100,
    noShares: 3900,
    totalLiquidity: 18000,
    closesAt: new Date(Date.now() + 3600000 * 6),
  },
  {
    id: "mkt_10",
    question: "Will orthopedic surgery slots be filled by Tuesday?",
    status: "active",
    yesShares: 4500,
    noShares: 5500,
    totalLiquidity: 9000,
    closesAt: new Date(Date.now() + 86400000 * 4),
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "resolved":
      return <Badge variant="secondary">Resolved</Badge>;
    case "disputed":
      return <Badge variant="warning">Disputed</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function MarketsPage() {
  const [tab, setTab] = useState("active");

  const filtered = marketsData.filter((m) => {
    if (tab === "active") return m.status === "active";
    if (tab === "resolved") return m.status === "resolved";
    return true; // "all"
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Prediction Markets"
        description="Prediction markets for healthcare staffing demand"
      >
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Market
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="resolved">Resolved</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Yes Shares</TableHead>
                    <TableHead>No Shares</TableHead>
                    <TableHead>Total Liquidity</TableHead>
                    <TableHead>Closes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((market) => (
                    <TableRow key={market.id}>
                      <TableCell className="font-medium">{market.question}</TableCell>
                      <TableCell>{getStatusBadge(market.status)}</TableCell>
                      <TableCell>{market.yesShares.toLocaleString()}</TableCell>
                      <TableCell>{market.noShares.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(market.totalLiquidity, 0)}</TableCell>
                      <TableCell>{formatDate(market.closesAt)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No markets found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="resolved" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Yes Shares</TableHead>
                    <TableHead>No Shares</TableHead>
                    <TableHead>Total Liquidity</TableHead>
                    <TableHead>Closes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((market) => (
                    <TableRow key={market.id}>
                      <TableCell className="font-medium">{market.question}</TableCell>
                      <TableCell>{getStatusBadge(market.status)}</TableCell>
                      <TableCell>{market.yesShares.toLocaleString()}</TableCell>
                      <TableCell>{market.noShares.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(market.totalLiquidity, 0)}</TableCell>
                      <TableCell>{formatDate(market.closesAt)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No markets found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Question</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Yes Shares</TableHead>
                    <TableHead>No Shares</TableHead>
                    <TableHead>Total Liquidity</TableHead>
                    <TableHead>Closes</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((market) => (
                    <TableRow key={market.id}>
                      <TableCell className="font-medium">{market.question}</TableCell>
                      <TableCell>{getStatusBadge(market.status)}</TableCell>
                      <TableCell>{market.yesShares.toLocaleString()}</TableCell>
                      <TableCell>{market.noShares.toLocaleString()}</TableCell>
                      <TableCell>{formatCurrency(market.totalLiquidity, 0)}</TableCell>
                      <TableCell>{formatDate(market.closesAt)}</TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No markets found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
