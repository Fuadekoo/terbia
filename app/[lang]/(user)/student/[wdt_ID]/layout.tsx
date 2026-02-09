import React from "react";
import { Attendance } from "../components/attendance";

export default function Layout({children}:{children:React.ReactNode}) {
    return <Attendance>
        {children}
    </Attendance>
}