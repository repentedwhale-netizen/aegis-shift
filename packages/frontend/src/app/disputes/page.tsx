"use client";

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
import { PageHeader } from "@/components/shared/page-header";
import { formatAddress, formatCurrency, formatDate } from "@/lib/utils";

const disputesData = [
  {
    id: "dsp_01",
    shift: "ER Night Shift",
    claimant: "Dr. Sarah Chen",
    claimantAddress: "0x7a9b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    respondent: "Hospital Admin",
    respondentAddress: "0xf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    amount: 2500,
    status: "active",
    resolution: null,
    createdAt: new Date(Date.now() - 86400000 * 1),
  },
  {
    id: "dsp_02",
    shift: "ICU Weekend Coverage",
    claimant: "Shift Coordinator",
    claimantAddress: "0x2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
    respondent: "Robert Kim, PA",
    respondentAddress: "0x5f6a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
    amount: 1500,
    status: "active",
    resolution: null,
    createdAt: new Date(Date.now() - 86400000 * 2),
  },
  {
    id: "dsp_03",
    shift: "Surgery Morning Block",
    claimant: "Trader_0x7a9b",
    claimantAddress: "0x7a9b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    respondent: "Market Oracle",
    respondentAddress: "0xd7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
    amount: 5000,
    status: "executed",
    resolution: "Claimant awarded full amount",
    createdAt: new Date(Date.now() - 86400000 * 5),
  },
  {
    id: "dsp_04",
    shift: "Pediatrics Morning",
    claimant: "Credential DAO",
    claimantAddress: "0x9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f",
    respondent: "Dr. Li Wei",
    respondentAddress: "0xc4e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d",
    amount: 800,
    status: "ai_resolved",
    resolution: "AI resolved in favor of claimant",
    createdAt: new Date(Date.now() - 86400000 * 3),
  },
  {
    id: "dsp_05",
    shift: "Cardiology On-Call",
    claimant: "Dr. James Wilson",
    claimantAddress: "0x2e8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    respondent: "Shift Coordinator",
    respondentAddress: "0x2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f",
    amount: 3200,
    status: "overridden",
    resolution: "Admin overridden — settled at $1,600",
    createdAt: new Date(Date.now() - 86400000 * 7),
  },
  {
    id: "dsp_06",
    shift: "Neurology Overnight",
    claimant: "Dr. Emily Watson",
    claimantAddress: "0x8d2e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    respondent: "Hospital Admin",
    respondentAddress: "0xf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    amount: 1800,
    status: "executed",
    resolution: "Claimant awarded $1,800",
    createdAt: new Date(Date.now() - 86400000 * 10),
  },
  {
    id: "dsp_07",
    shift: "Oncology Weekend",
    claimant: "Priya Sharma, NP",
    claimantAddress: "0xd7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
    respondent: "Insurance Oracle",
    respondentAddress: "0xb4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a",
    amount: 4200,
    status: "active",
    resolution: null,
    createdAt: new Date(Date.now() - 86400000 * 1.5),
  },
  {
    id: "dsp_08",
    shift: "Orthopedic Surgery",
    claimant: "Dr. Michael Torres",
    claimantAddress: "0xe1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
    respondent: "Hospital Admin",
    respondentAddress: "0xf1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    amount: 2900,
    status: "ai_resolved",
    resolution: "AI resolved — split 50/50",
    createdAt: new Date(Date.now() - 86400000 * 4),
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="warning">Active</Badge>;
    case "ai_resolved":
      return <Badge variant="default">AI Resolved</Badge>;
    case "executed":
      return <Badge variant="success">Executed</Badge>;
    case "overridden":
      return <Badge variant="destructive">Overridden</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function DisputesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Disputes"
        description="AI-assisted shift dispute resolution"
      >
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          File Dispute
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Shift</TableHead>
                <TableHead>Parties</TableHead>
                <TableHead>Amount</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Resolution</TableHead>
                <TableHead>Date</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {disputesData.map((dispute) => (
                <TableRow key={dispute.id}>
                  <TableCell className="font-mono text-xs font-medium">
                    {dispute.id}
                  </TableCell>
                  <TableCell className="font-medium">{dispute.shift}</TableCell>
                  <TableCell>
                    <div className="space-y-0.5">
                      <p className="text-xs">
                        <span className="text-muted-foreground">C: </span>
                        {dispute.claimant.length > 20
                          ? dispute.claimant
                          : formatAddress(dispute.claimantAddress, 4)}
                      </p>
                      <p className="text-xs">
                        <span className="text-muted-foreground">R: </span>
                        {dispute.respondent.length > 20
                          ? dispute.respondent
                          : formatAddress(dispute.respondentAddress, 4)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell>{formatCurrency(dispute.amount, 0)}</TableCell>
                  <TableCell>{getStatusBadge(dispute.status)}</TableCell>
                  <TableCell className="max-w-[200px]">
                    {dispute.resolution ? (
                      <span className="text-sm">{dispute.resolution}</span>
                    ) : (
                      <span className="text-sm text-muted-foreground">Pending</span>
                    )}
                  </TableCell>
                  <TableCell className="text-sm">
                    {formatDate(dispute.createdAt)}
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
