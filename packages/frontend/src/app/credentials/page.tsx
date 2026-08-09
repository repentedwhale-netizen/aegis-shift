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
import { formatAddress, formatDate } from "@/lib/utils";

const credentialsData = [
  {
    id: "cred_01",
    holder: "Dr. Sarah Chen",
    holderAddress: "0x7a9b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    type: "medical_license",
    issuedAt: new Date(Date.now() - 30 * 86400000),
    expiresAt: new Date(Date.now() + 335 * 86400000),
    status: "active",
  },
  {
    id: "cred_02",
    holder: "Dr. James Wilson",
    holderAddress: "0x2e8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    type: "board_certification",
    issuedAt: new Date(Date.now() - 365 * 86400000),
    expiresAt: new Date(Date.now() + 365 * 86400000),
    status: "active",
  },
  {
    id: "cred_03",
    holder: "Maria Rodriguez, RN",
    holderAddress: "0x9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
    type: "CPR_certification",
    issuedAt: new Date(Date.now() - 90 * 86400000),
    expiresAt: new Date(Date.now() + 275 * 86400000),
    status: "active",
  },
  {
    id: "cred_04",
    holder: "Dr. Aisha Patel",
    holderAddress: "0x1b3c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
    type: "board_certification",
    issuedAt: new Date(Date.now() - 180 * 86400000),
    expiresAt: new Date(Date.now() + 550 * 86400000),
    status: "active",
  },
  {
    id: "cred_05",
    holder: "Robert Kim, PA",
    holderAddress: "0x5f6a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
    type: "medical_license",
    issuedAt: new Date(Date.now() - 250 * 86400000),
    expiresAt: new Date(Date.now() - 10 * 86400000),
    status: "revoked",
  },
  {
    id: "cred_06",
    holder: "Dr. Emily Watson",
    holderAddress: "0x8d2e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    type: "specialty_certification",
    issuedAt: new Date(Date.now() - 60 * 86400000),
    expiresAt: new Date(Date.now() + 670 * 86400000),
    status: "active",
  },
  {
    id: "cred_07",
    holder: "David Okafor, RN",
    holderAddress: "0x3a7b6c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
    type: "CPR_certification",
    issuedAt: new Date(Date.now() - 45 * 86400000),
    expiresAt: new Date(Date.now() + 320 * 86400000),
    status: "active",
  },
  {
    id: "cred_08",
    holder: "Dr. Li Wei",
    holderAddress: "0xc4e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d",
    type: "state_license",
    issuedAt: new Date(Date.now() - 120 * 86400000),
    expiresAt: new Date(Date.now() + 245 * 86400000),
    status: "active",
  },
];

function formatCredentialType(type: string): string {
  return type
    .split("_")
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "revoked":
      return <Badge variant="destructive">Revoked</Badge>;
    case "expired":
      return <Badge variant="warning">Expired</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function CredentialsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Credentials"
        description="On-chain verified healthcare credentials"
      >
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Issue Credential
        </Button>
      </PageHeader>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Holder</TableHead>
                <TableHead>Type</TableHead>
                <TableHead>Issued</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {credentialsData.map((cred) => (
                <TableRow key={cred.id}>
                  <TableCell>
                    <div>
                      <p className="font-medium">{cred.holder}</p>
                      <p className="font-mono text-xs text-muted-foreground">
                        {formatAddress(cred.holderAddress)}
                      </p>
                    </div>
                  </TableCell>
                  <TableCell className="font-medium">
                    {formatCredentialType(cred.type)}
                  </TableCell>
                  <TableCell>{formatDate(cred.issuedAt)}</TableCell>
                  <TableCell>{formatDate(cred.expiresAt)}</TableCell>
                  <TableCell>{getStatusBadge(cred.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
