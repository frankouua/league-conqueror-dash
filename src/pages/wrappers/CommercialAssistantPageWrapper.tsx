import Header from "@/components/Header";
import CommercialAssistantPage from "@/pages/CommercialAssistantPage";

export default function CommercialAssistantPageWrapper() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <CommercialAssistantPage />
    </div>
  );
}
