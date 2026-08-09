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
import { formatRelativeTime } from "@/lib/utils";

const shiftsData = [
  {
    id: "sh_01",
    staffName: "Dr. Sarah Chen",
    role: "ER Physician",
    department: "Emergency",
    startedAt: new Date(Date.now() + 3600000),
    status: "active",
  },
  {
    id: "sh_02",
    staffName: "Maria Rodriguez, RN",
    role: "ICU Nurse",
    department: "ICU",
    startedAt: new Date(Date.now() + 7200000),
    status: "active",
  },
  {
    id: "sh_03",
    staffName: "Dr. Aisha Patel",
    role: "Pediatrician",
    department: "Pediatrics",
    startedAt: new Date(Date.now() + 10800000),
    status: "active",
  },
  {
    id: "sh_04",
    staffName: "Dr. James Wilson",
    role: "Cardiac Surgeon",
    department: "Cardiology",
    startedAt: new Date(Date.now() + 14400000),
    status: "active",
  },
  {
    id: "sh_05",
    staffName: "David Okafor, RN",
    role: "ER Nurse",
    department: "Emergency",
    startedAt: new Date(Date.now() + 21600000),
    status: "active",
  },
  {
    id: "sh_06",
    staffName: "Dr. Emily Watson",
    role: "Neurologist",
    department: "Neurology",
    startedAt: new Date(Date.now() + 28800000),
    status: "active",
  },
  {
    id: "sh_07",
    staffName: "Dr. Li Wei",
    role: "Anesthesiologist",
    department: "Surgery",
    startedAt: new Date(Date.now() + 36000000),
    status: "active",
  },
  {
    id: "sh_08",
    staffName: "Priya Sharma, NP",
    role: "Nurse Practitioner",
    department: "Oncology",
    startedAt: new Date(Date.now() - 86400000),
    status: "completed",
  },
  {
    id: "sh_09",
    staffName: "Dr. Sarah Chen",
    role: "ER Physician",
    department: "Emergency",
    startedAt: new Date(Date.now() - 86400000 * 2),
    status: "completed",
  },
  {
    id: "sh_10",
    staffName: "Maria Rodriguez, RN",
    role: "ICU Nurse",
    department: "ICU",
    startedAt: new Date(Date.now() - 86400000 * 3),
    status: "completed",
  },
  {
    id: "sh_11",
    staffName: "Dr. James Wilson",
    role: "Cardiac Surgeon",
    department: "Cardiology",
    startedAt: new Date(Date.now() - 86400000),
    status: "completed",
  },
  {
    id: "sh_12",
    staffName: "David Okafor, RN",
    role: "ER Nurse",
    department: "Emergency",
    startedAt: new Date(Date.now() - 86400000 * 4),
    status: "completed",
  },
  {
    id: "sh_13",
    staffName: "Dr. Michael Torres",
    role: "Orthopedic Surgeon",
    department: "Orthopedics",
    startedAt: new Date(Date.now() - 86400000 * 2),
    status: "cancelled",
  },
  {
    id: "sh_14",
    staffName: "Robert Kim, PA",
    role: "Physician Assistant",
    department: "General Medicine",
    startedAt: new Date(Date.now() - 86400000 * 5),
    status: "completed",
  },
  {
    id: "sh_15",
    staffName: "Dr. Aisha Patel",
    role: "Pediatrician",
    department: "Pediatrics",
    startedAt: new Date(Date.now() - 86400000 * 3),
    status: "completed",
  },
];

function getStatusBadge(status: string) {
  switch (status) {
    case "active":
      return <Badge variant="success">Active</Badge>;
    case "completed":
      return <Badge variant="default">Completed</Badge>;
    case "cancelled":
      return <Badge variant="destructive">Cancelled</Badge>;
    default:
      return <Badge>{status}</Badge>;
  }
}

export default function ShiftsPage() {
  const [tab, setTab] = useState("active");

  const filtered = shiftsData.filter((s) => {
    if (tab === "active") return s.status === "active";
    if (tab === "completed") return s.status === "completed";
    return true; // "all"
  });

  return (
    <div className="space-y-6">
      <PageHeader
        title="Shifts"
        description="Active and historical shift assignments"
      >
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Create Shift
        </Button>
      </PageHeader>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList>
          <TabsTrigger value="active">Active</TabsTrigger>
          <TabsTrigger value="completed">Completed</TabsTrigger>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
        <TabsContent value="active" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.staffName}</TableCell>
                      <TableCell>{shift.role}</TableCell>
                      <TableCell>{shift.department}</TableCell>
                      <TableCell>{formatRelativeTime(shift.startedAt)}</TableCell>
                      <TableCell>{getStatusBadge(shift.status)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No shifts found for this filter.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
        <TabsContent value="completed" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.staffName}</TableCell>
                      <TableCell>{shift.role}</TableCell>
                      <TableCell>{shift.department}</TableCell>
                      <TableCell>{formatRelativeTime(shift.startedAt)}</TableCell>
                      <TableCell>{getStatusBadge(shift.status)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No shifts found for this filter.
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
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Started</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((shift) => (
                    <TableRow key={shift.id}>
                      <TableCell className="font-medium">{shift.staffName}</TableCell>
                      <TableCell>{shift.role}</TableCell>
                      <TableCell>{shift.department}</TableCell>
                      <TableCell>{formatRelativeTime(shift.startedAt)}</TableCell>
                      <TableCell>{getStatusBadge(shift.status)}</TableCell>
                      <TableCell>
                        <Button variant="outline" size="sm">
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                  {filtered.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        No shifts found for this filter.
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
