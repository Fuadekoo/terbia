import prisma from "@/lib/db";
import { NextRequest, NextResponse } from "next/server";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ wdt_ID: string }> }
) {
  try {
    const { wdt_ID } = await params;
    
    if (!wdt_ID) {
      return NextResponse.json({ error: "Missing student ID" }, { status: 400 });
    }

    const studentId = parseInt(wdt_ID);

    if (isNaN(studentId)) {
      return NextResponse.json({ error: "Invalid student ID format" }, { status: 400 });
    }

    // Check if student exists first
    const student = await prisma.wpos_wpdatatable_23.findUnique({
        where: { wdt_ID: studentId }
    });

    if (!student) {
        return NextResponse.json({ error: "Student not found" }, { status: 404 });
    }

    // Check if an attendance record already exists for this student
    const existingAttendance = await prisma.attendance.findFirst({
        where: { studentId: studentId }
    });

    let attendance;

    if (existingAttendance) {
        // Update the existing record's lastSeen time to now
        attendance = await prisma.attendance.update({
            where: { id: existingAttendance.id },
            data: { lastSeen: new Date() }
        });
    } else {
        // Create a new attendance record
        attendance = await prisma.attendance.create({
            data: {
                studentId: studentId,
                lastSeen: new Date()
            },
        });
    }

    return NextResponse.json({ 
        success: true, 
        message: existingAttendance ? "Attendance updated" : "Attendance recorded",
        data: attendance 
    });

  } catch (error) {
    console.error("[ATTENDANCE_ERROR]", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
