import { serve } from "https://deno.land/std@0.190.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface SellerStatus {
  userId: string;
  name: string;
  teamId: string;
  teamName: string;
  meta1Goal: number;
  meta1Actual: number;
  meta1Percent: number;
  daysRemaining: number;
  status: "critical" | "warning" | "on-track" | "achieved";
}

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    console.log("Starting critical seller check...");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get current month/year
    const now = new Date();
    const month = now.getMonth() + 1;
    const year = now.getFullYear();
    const endOfMonth = new Date(year, month, 0);
    const daysRemaining = Math.max(0, Math.ceil((endOfMonth.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)));

    console.log(`Checking for month ${month}/${year}, ${daysRemaining} days remaining`);

    // Fetch predefined goals
    const { data: goals, error: goalsError } = await supabase
      .from("predefined_goals")
      .select("*")
      .eq("month", month)
      .eq("year", year)
      .not("matched_user_id", "is", null);

    if (goalsError) {
      console.error("Error fetching goals:", goalsError);
      throw goalsError;
    }

    if (!goals || goals.length === 0) {
      console.log("No goals found for this month");
      return new Response(JSON.stringify({ message: "No goals found", checked: 0 }), {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Fetch profiles
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("user_id, full_name, team_id");

    if (profilesError) {
      console.error("Error fetching profiles:", profilesError);
      throw profilesError;
    }

    // Fetch teams
    const { data: teams, error: teamsError } = await supabase
      .from("teams")
      .select("id, name");

    if (teamsError) {
      console.error("Error fetching teams:", teamsError);
      throw teamsError;
    }

    const teamMap = new Map(teams?.map((t) => [t.id, t.name]) || []);
    const profileMap = new Map(profiles?.map((p) => [p.user_id, p]) || []);

    // Fetch revenue for current month
    const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
    const endDate = `${year}-${String(month).padStart(2, "0")}-31`;

    const { data: revenueRecords, error: revenueError } = await supabase
      .from("revenue_records")
      .select("user_id, amount")
      .gte("date", startDate)
      .lte("date", endDate);

    if (revenueError) {
      console.error("Error fetching revenue:", revenueError);
      throw revenueError;
    }

    // Calculate revenue by user
    const revenueByUser = new Map<string, number>();
    revenueRecords?.forEach((r) => {
      const current = revenueByUser.get(r.user_id) || 0;
      revenueByUser.set(r.user_id, current + Number(r.amount));
    });

    // Check each seller's status
    const criticalSellers: SellerStatus[] = [];
    const warningSellers: SellerStatus[] = [];

    for (const goal of goals) {
      const userId = goal.matched_user_id;
      const profile = profileMap.get(userId);
      if (!profile) continue;

      const meta1Goal = Number(goal.meta1_goal);
      const actual = revenueByUser.get(userId) || 0;
      const percent = meta1Goal > 0 ? Math.round((actual / meta1Goal) * 100) : 0;

      let status: SellerStatus["status"] = "on-track";
      if (percent >= 100) {
        status = "achieved";
      } else if (percent < 50 && daysRemaining < 15) {
        status = "critical";
      } else if (percent < 70 && daysRemaining < 10) {
        status = "warning";
      }

      const sellerData: SellerStatus = {
        userId,
        name: profile.full_name,
        teamId: profile.team_id,
        teamName: teamMap.get(profile.team_id) || "Sem equipe",
        meta1Goal,
        meta1Actual: actual,
        meta1Percent: percent,
        daysRemaining,
        status,
      };

      if (status === "critical") {
        criticalSellers.push(sellerData);
      } else if (status === "warning") {
        warningSellers.push(sellerData);
      }
    }

    console.log(`Found ${criticalSellers.length} critical and ${warningSellers.length} warning sellers`);

    // Check for existing notifications today to avoid duplicates
    const today = now.toISOString().split("T")[0];
    
    const { data: existingNotifications } = await supabase
      .from("notifications")
      .select("message")
      .eq("type", "seller_critical")
      .gte("created_at", `${today}T00:00:00`);

    const existingUserIds = new Set(
      existingNotifications?.map((n) => {
        const match = n.message.match(/\[UID:(.*?)\]/);
        return match ? match[1] : null;
      }).filter(Boolean) || []
    );

    // Fetch admin users to notify them
    const { data: adminRoles } = await supabase
      .from("user_roles")
      .select("user_id")
      .eq("role", "admin");

    const adminUserIds = adminRoles?.map((r) => r.user_id) || [];

    // Create notifications for critical sellers
    const notifications: Array<{
      user_id: string;
      team_id: string | null;
      type: string;
      title: string;
      message: string;
    }> = [];

    for (const seller of criticalSellers) {
      // Skip if already notified today
      if (existingUserIds.has(seller.userId)) {
        console.log(`Skipping ${seller.name} - already notified today`);
        continue;
      }

      const formatCurrency = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

      const remaining = Math.max(0, seller.meta1Goal - seller.meta1Actual);
      const dailyNeeded = seller.daysRemaining > 0 ? remaining / seller.daysRemaining : remaining;

      // Notify all admins
      for (const adminId of adminUserIds) {
        notifications.push({
          user_id: adminId,
          team_id: null,
          type: "seller_critical",
          title: `⚠️ ${seller.name} em situação CRÍTICA`,
          message: `${seller.name} está com ${seller.meta1Percent}% da meta (${formatCurrency(seller.meta1Actual)}/${formatCurrency(seller.meta1Goal)}). Faltam ${seller.daysRemaining} dias. Precisa de ${formatCurrency(dailyNeeded)}/dia. [UID:${seller.userId}]`,
        });
      }

      // Also notify the seller themselves
      notifications.push({
        user_id: seller.userId,
        team_id: null,
        type: "seller_critical",
        title: "⚠️ Sua meta precisa de atenção!",
        message: `Você está com ${seller.meta1Percent}% da meta (${formatCurrency(seller.meta1Actual)}/${formatCurrency(seller.meta1Goal)}). Faltam ${seller.daysRemaining} dias. Precisa de ${formatCurrency(dailyNeeded)}/dia para bater a Meta 1. [UID:${seller.userId}]`,
      });
    }

    // Create warning notifications
    for (const seller of warningSellers) {
      if (existingUserIds.has(seller.userId)) {
        console.log(`Skipping ${seller.name} - already notified today`);
        continue;
      }

      const formatCurrency = (v: number) =>
        new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

      const remaining = Math.max(0, seller.meta1Goal - seller.meta1Actual);

      // Notify the seller
      notifications.push({
        user_id: seller.userId,
        team_id: null,
        type: "seller_warning",
        title: "📊 Atenção com sua meta",
        message: `Você está com ${seller.meta1Percent}% da meta. Faltam ${formatCurrency(remaining)} para bater a Meta 1 em ${seller.daysRemaining} dias. [UID:${seller.userId}]`,
      });
    }

    // Insert notifications
    if (notifications.length > 0) {
      const { error: insertError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (insertError) {
        console.error("Error inserting notifications:", insertError);
        throw insertError;
      }
      console.log(`Created ${notifications.length} notifications`);
    }

    return new Response(
      JSON.stringify({
        success: true,
        checked: goals.length,
        critical: criticalSellers.length,
        warning: warningSellers.length,
        notificationsCreated: notifications.length,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error: unknown) {
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    console.error("Error in check-critical-sellers:", error);
    return new Response(
      JSON.stringify({ error: errorMessage }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
