import Header from "@/components/Header";
import Cancellations from "@/pages/Cancellations";

export default function CancellationsPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-background via-background to-primary/5">
      <Header />
      <Cancellations />
    </div>
  );
}
