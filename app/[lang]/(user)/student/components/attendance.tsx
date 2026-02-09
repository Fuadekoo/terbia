"use client"

import React, { useEffect } from "react"
import { useParams } from "next/navigation"

export function Attendance({ children }: { children: React.ReactNode }) {
    const params = useParams()
    const wdt_ID = params?.wdt_ID as string | undefined

    useEffect(() => {
        if (!wdt_ID) return;

        const recordAttendance = async () => {
            try {
                const res = await fetch(`/api/student/attendance/${wdt_ID}`)
                if (!res.ok) {
                    throw new Error(`HTTP error! status: ${res.status}`)
                }
                const data = await res.json()
                console.log("Attendance sync:", data)
            } catch (error) {
                console.error("Failed to record attendance:", error)
            }
        }

        recordAttendance()
    }, [wdt_ID])
    
    return <>{children}</>
}