import Image from "next/image";
import Schedule from "./(includes)/Schedule";
import UpcomingCT from "./(includes)/UpcomingCT";

export default function Home() {
  return (
    <main>
      <Schedule />
      <UpcomingCT/>
    </main>
  );
}
