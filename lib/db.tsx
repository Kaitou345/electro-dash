export interface CT {
  subject: string;
  teacher: string;
  startTime: string;
  duration: number;
  room: string;
  topics: string;
}

export interface RescheduleOrSkip {
  subject: string;
  teacher: string;
  startTime: string;
}

export interface Day {
  id: number;
  name: string;
  CT: CT[];
  reschedules: RescheduleOrSkip[];
  skippedClass: RescheduleOrSkip[];
  notes?: string | null;
  dayOff: boolean;
}

export const weekData: Day[] = [
  {
    id: 1,
    name: "Saturday",
    CT: [
      {
        subject: "HUM 277",
        teacher: "Mahfuz",
        topics: "Data analysis",
        startTime: "12:30",
        duration: 30,
        room: "EEE-631",
      },
      {
        subject: "MATH 257",
        teacher: "Mahfuz",
        topics: "Homogenous",
        startTime: "2:30",
        duration: 20,
        room: "EEE-231",
      },
    ],
    reschedules: [
      {
        subject: "MATH 257",
        startTime: "9:00",
        teacher: "Zia",
      },
      {
        subject: "EEE 105",
        startTime: "9:00",
        teacher: "Zia",
      },
    ],
    skippedClass: [
      {
        subject: "CSE 101",
        startTime: "9:00",
        teacher: "Afroza",
      },
      {
        subject: "MATH 257",
        startTime: "9:00",
        teacher: "Zia",
      },
    ],
    notes: null,
    dayOff: false,
  },
  {
    id: 2,
    name: "Sunday",
    notes: "Bring Calculator To EEE LAB",
    dayOff: false,
    CT: [],
    reschedules: [],
    skippedClass: [],
  },
  {
    id: 3,
    name: "Monday",
    dayOff: true,
    CT: [],
    reschedules: [],
    skippedClass: [],
    notes: null,
  },
  {
    id: 4,
    name: "Tuesday",
    CT: [],
    reschedules: [],
    skippedClass: [],
    notes: null,
    dayOff: false,
  },
  {
    id: 5,
    name: "Wednesday",
    dayOff: false,
    CT: [],
    reschedules: [],
    skippedClass: [],
    notes: null,
  },
];
