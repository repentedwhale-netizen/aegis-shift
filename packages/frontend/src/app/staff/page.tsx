"use client";

import { Card, CardContent } from "@/components/ui/card";
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
import { formatAddress } from "@/lib/utils";

const staffData = [
  {
    id: "st_01",
    name: "Dr. Sarah Chen",
    address: "0x7a9b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b",
    role: "ER Physician",
    department: "Emergency",
    shiftsCompleted: 247,
    status: "active",
  },
  {
    id: "st_02",
    name: "Dr. James Wilson",
    address: "0x2e8f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f",
    role: "Cardiac Surgeon",
    department: "Cardiology",
    shiftsCompleted: 183,
    status: "active",
  },
  {
    id: "st_03",
    name: "Maria Rodriguez, RN",
    address: "0x9c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2",
    role: "ICU Nurse",
    department: "ICU",
    shiftsCompleted: 312,
    status: "active",
  },
  {
    id: "st_04",
    name: "Dr. Aisha Patel",
    address: "0x1b3c7d8e9f0a1b2c3d4e5f6a7b8c9d0e1f2a3b",
    role: "Pediatrician",
    department: "Pediatrics",
    shiftsCompleted: 156,
    status: "active",
  },
  {
    id: "st_05",
    name: "Robert Kim, PA",
    address: "0x5f6a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e5f",
    role: "Physician Assistant",
    department: "General Medicine",
    shiftsCompleted: 98,
    status: "inactive",
  },
  {
    id: "st_06",
    name: "Dr. Emily Watson",
    address: "0x8d2e4f1a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d",
    role: "Neurologist",
    department: "Neurology",
    shiftsCompleted: 201,
    status: "active",
  },
  {
    id: "st_07",
    name: "David Okafor, RN",
    address: "0x3a7b6c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a",
    role: "ER Nurse",
    department: "Emergency",
    shiftsCompleted: 278,
    status: "active",
  },
  {
    id: "st_08",
    name: "Dr. Li Wei",
    address: "0xc4e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d",
    role: "Anesthesiologist",
    department: "Surgery",
    shiftsCompleted: 134,
    status: "active",
  },
  {
    id: "st_09",
    name: "Priya Sharma, NP",
    address: "0xd7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5",
    role: "Nurse Practitioner",
    department: "Oncology",
    shiftsCompleted: 167,
    status: "active",
  },
  {
    id: "st_10",
    name: "Dr. Michael Torres",
    address: "0xe1f2a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e",
    role: "Orthopedic Surgeon",
    department: "Orthopedics",
    shiftsCompleted: 89,
    status: "inactive",
  },
];

export default function StaffPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Staff Directory"
        description="Healthcare professionals registered on Aegis Shift"
      />

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Address</TableHead>
                <TableHead>Role</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Shifts</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {staffData.map((staff) => (
                <TableRow key={staff.id}>
                  <TableCell className="font-medium">{staff.name}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {formatAddress(staff.address)}
                  </TableCell>
                  <TableCell>{staff.role}</TableCell>
                  <TableCell>{staff.department}</TableCell>
                  <TableCell>{staff.shiftsCompleted}</TableCell>
                  <TableCell>
                    <Badge variant={staff.status === "active" ? "success" : "secondary"}>
                      {staff.status}
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
