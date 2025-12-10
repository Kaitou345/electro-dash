import React from "react";
import Container from "@/components/Container";
import { weekData, type Day } from "@/lib/db";

interface UpcomingCTItem {
  dayName: string;
  subject: string;
  teacher: string;
  startTime: string;
  duration: number;
  room: string;
  topics: string;
}

const UpcomingCT = () => {
  // Flatten all CTs with their day information
  const upcomingCTs: UpcomingCTItem[] = weekData.flatMap((day: Day) =>
    day.CT.map((ct) => ({
      dayName: day.name,
      subject: ct.subject,
      teacher: ct.teacher,
      startTime: ct.startTime,
      duration: ct.duration,
      room: ct.room,
      topics: ct.topics,
    }))
  );

  return (
    <section className="bg-gray-900 text-gray-100 py-8">
      <Container>
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold">Upcoming Class Tests (CT)</h2>
            <p className="text-sm text-gray-400 mt-1">
              Overview of all CTs from your current weekly schedule.
            </p>
          </div>
        </div>

        {upcomingCTs.length === 0 ? (
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4 text-sm text-gray-300">
            No upcoming class tests found in this week&apos;s schedule.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {upcomingCTs.map((ct, index) => (
              <div
                key={`${ct.dayName}-${ct.subject}-${ct.startTime}-${index}`}
                className="rounded-lg border border-gray-700 bg-gray-800 p-4 flex flex-col gap-2"
              >
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold uppercase tracking-wide text-gray-400">
                    {ct.dayName}
                  </span>
                  <span className="text-xs rounded-full bg-blue-500/10 border border-blue-500/40 px-2 py-0.5 text-blue-300">
                    CT
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-semibold">{ct.subject}</h3>
                  <p className="text-xs text-gray-400 mt-0.5">
                    {ct.topics || "No topic specified"}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3 text-xs text-gray-300 mt-1">
                  <span className="flex items-center gap-1">
                    <span className="h-2 w-2 rounded-full bg-green-400" />
                    {ct.startTime}
                  </span>
                  <span>Duration: {ct.duration} mins</span>
                  <span>Room: {ct.room}</span>
                </div>

                <p className="text-xs text-gray-400 mt-1">
                  Teacher: <span className="text-gray-200">{ct.teacher}</span>
                </p>
              </div>
            ))}
          </div>
        )}
      </Container>
    </section>
  );
};

export default UpcomingCT;
