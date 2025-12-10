"use client";
import React, { useState } from "react";
import Container from "@/components/Container";
import { weekData, Day } from "@/lib/db";

const Modal = ({
  isOpen,
  onClose,
  title,
  children,
}: {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) => {
  if (!isOpen) return null;

  const handleOverlayClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  return (
    <div
      onClick={handleOverlayClick}
      className="fixed inset-0 bg-transparent backdrop-blur-sm flex items-center justify-center z-50 px-4"
    >
      <div className="relative bg-gray-800 p-6 rounded-lg w-full max-w-md max-h-[80vh] overflow-y-auto">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-300 hover:text-white text-2xl font-bold"
        >
          x
        </button>

        <h2 className="text-lg font-bold mb-4 pr-6">{title}</h2>

        <div className="space-y-4">{children}</div>

        <button
          className="hover:cursor-pointer mt-4 w-full px-4 py-2 bg-blue-500 rounded hover:bg-blue-600 text-sm font-medium"
          onClick={onClose}
        >
          Close
        </button>
      </div>
    </div>
  );
};

const Schedule = () => {
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedDay, setSelectedDay] = useState<Day | null>(null);

  const openDayModal = (day: Day) => {
    setSelectedDay(day);
    setModalOpen(true);
  };

  const renderDayDetails = (day: Day) => {
    return (
      <div className="space-y-4 text-sm">
        {day.dayOff && (
          <div className="inline-flex items-center rounded-full bg-green-900/40 px-3 py-1 text-xs font-semibold text-green-300">
            Day Off
          </div>
        )}

        {/* CTs = Class Tests */}
        <div>
          <h3 className="font-semibold text-base mb-2">Class Tests (CT)</h3>
          {day.CT.length ? (
            <ul className="space-y-2">
              {day.CT.map((ct, idx) => (
                <li
                  key={idx}
                  className="rounded-md border border-red-700/60 bg-red-900/10 p-3 text-xs"
                >
                  <div className="flex justify-between text-sm">
                    <span className="font-medium">{ct.subject}</span>
                    <span>{ct.startTime}</span>
                  </div>
                  <p className="text-xs text-gray-300">Topic: {ct.topics}</p>
                  <p className="text-xs text-gray-400">
                    Teacher: {ct.teacher} • Duration: {ct.duration} mins • Room:{" "}
                    {ct.room}
                  </p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No class tests scheduled.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-base mb-2">Rescheduled Classes</h3>
          {day.reschedules.length ? (
            <ul className="space-y-2">
              {day.reschedules.map((item, idx) => (
                <li
                  key={idx}
                  className="rounded-md border border-yellow-700/60 bg-yellow-900/10 p-3 text-xs"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{item.subject}</span>
                    <span>{item.startTime}</span>
                  </div>
                  <p className="text-gray-300">Teacher: {item.teacher}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No rescheduled classes.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-base mb-2">Skipped Classes</h3>
          {day.skippedClass.length ? (
            <ul className="space-y-2">
              {day.skippedClass.map((item, idx) => (
                <li
                  key={idx}
                  className="rounded-md border border-green-700/60 bg-green-900/10 p-3 text-xs"
                >
                  <div className="flex justify-between">
                    <span className="font-medium">{item.subject}</span>
                    <span>{item.startTime}</span>
                  </div>
                  <p className="text-gray-300">Teacher: {item.teacher}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No skipped classes.</p>
          )}
        </div>

        <div>
          <h3 className="font-semibold text-base mb-2">Notes</h3>
          {day.notes ? (
            <p className="text-gray-200">{day.notes}</p>
          ) : (
            <p className="text-gray-400">No notes for this day.</p>
          )}
        </div>
      </div>
    );
  };

  return (
    <section className="bg-gray-900 text-gray-100 min-h-screen py-8">
      <Container>
        <h1 className="text-2xl font-semibold mb-6">Weekly Class Schedule</h1>

        <div className="grid grid-cols-1 gap-4">
          {weekData.map((day) => {
            const hasCT = day.CT.length > 0;
            const hasReschedules = day.reschedules.length > 0;
            const hasSkipped = day.skippedClass.length > 0;
            const hasNotes = !!day.notes;

            return (
              <button
                key={day.id}
                type="button"
                onClick={() => openDayModal(day)}
                className={`group w-full text-left rounded-lg border border-gray-700 p-4 transition-all
                  ${day.dayOff ? "opacity-70 bg-gray-800" : "bg-gray-700"}
                  hover:border-blue-500 hover:bg-gray-600 hover:scale-[1.02]
                  active:scale-[0.98] cursor-pointer shadow-sm hover:shadow-md flex items-center justify-between`}
              >
                <div className="flex flex-col gap-3 sm:grid sm:grid-cols-5 sm:items-center w-full">
                  <div className="font-bold text-base sm:text-lg">{day.name}</div>

                  <div
                    className={
                      hasCT ? "text-red-400 text-sm" : "text-gray-500 text-sm"
                    }
                  >
                    {hasCT
                      ? `${day.CT.length} CT${day.CT.length > 1 ? "s" : ""}`
                      : "No Class Tests"}
                  </div>

                  <div
                    className={
                      hasReschedules
                        ? "text-yellow-400 text-sm"
                        : "text-gray-500 text-sm"
                    }
                  >
                    {hasReschedules
                      ? `${day.reschedules.length} Reschedule${
                          day.reschedules.length > 1 ? "s" : ""
                        }`
                      : "No Reschedules"}
                  </div>

                  <div
                    className={
                      hasSkipped
                        ? "text-green-400 text-sm"
                        : "text-gray-500 text-sm"
                    }
                  >
                    {hasSkipped
                      ? `${day.skippedClass.length} Skipped`
                      : "No Skipped"}
                  </div>

                  <div
                    className={
                      hasNotes
                        ? "text-blue-400 text-sm"
                        : "text-gray-500 text-sm"
                    }
                  >
                    {hasNotes ? "Has Note" : "No Notes"}
                  </div>

                  <p className="mt-2 text-xs text-gray-400 sm:hidden">
                    Click to view details
                  </p>
                </div>

                <span className="hidden sm:inline-block text-gray-400 text-lg font-bold ml-3 group-hover:text-white">
                  ›
                </span>
              </button>
            );
          })}
        </div>
      </Container>

      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={selectedDay?.name ?? ""}
      >
        {selectedDay && renderDayDetails(selectedDay)}
      </Modal>
    </section>
  );
};

export default Schedule;
