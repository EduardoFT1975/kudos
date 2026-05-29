import type { Metadata } from "next";
import { TimeRomeScreen } from "@/components/screens/time-rome/TimeRomeScreen";
export const metadata: Metadata = { title: "Time Machine · Roma", description: "27 siglos en una ciudad." };
export default function Page() { return <TimeRomeScreen />; }
