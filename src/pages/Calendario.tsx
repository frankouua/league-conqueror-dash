import Header from "@/components/Header";
import { SellerUnifiedCalendar } from "@/components/SellerUnifiedCalendar";

export default function Calendario() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="container mx-auto px-4 py-6">
        <SellerUnifiedCalendar />
      </main>
    </div>
  );
}
