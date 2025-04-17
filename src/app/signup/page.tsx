import Signup from "@/components/Signup";
import { Suspense } from "react";

export default function Home() {
  return (
    <div>
     <Suspense fallback={<p>Loading...</p>}>
      <Signup />
    </Suspense>
    </div>
  );
}