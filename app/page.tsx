import Image from "next/image";
import Schedule from "./(includes)/Schedule";
import UpcomingCT from "./(includes)/Events";
import AdminPanel from "./(includes)/AdminPanel";
import Events from "./(includes)/Events";
import Notes from "./(includes)/Notes";

export default function Home() {
  return (
    <main>
      <Schedule />
      <Events/>
      <Notes />
      <AdminPanel />
    </main>
  );
}
