import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";

export default function Home() {
  return (
    <main className="flex justify-center items-center flex-col min-h-screen p-24 bg-gray-100">
      <h1>Hello Welcome to ShiftGrid</h1>
      <div className="flex flex-col justify-between gap-5 mt-5">
        <Button variant="outline">
          <Link href="./Employee">Employee</Link>
        </Button>
        <Button variant="outline">
          <Link href="/Roster">Roster</Link>
        </Button>
      </div>
    </main>
  );
}
