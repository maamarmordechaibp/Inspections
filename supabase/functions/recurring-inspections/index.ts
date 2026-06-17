import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

interface RecurringSchedule {
  id: string;
  asset_id: string;
  customer_id: string;
  asset_type: string;
  frequency: string;
  interval_days: number;
  start_date: string;
  last_generated_date: string | null;
  next_due_date: string | null;
}

function getNextDate(date: Date, frequency: string, intervalDays: number): Date {
  const next = new Date(date);
  switch (frequency) {
    case 'monthly':
      next.setMonth(next.getMonth() + 1);
      break;
    case 'quarterly':
      next.setMonth(next.getMonth() + 3);
      break;
    case 'semiannual':
      next.setMonth(next.getMonth() + 6);
      break;
    case 'annual':
      next.setFullYear(next.getFullYear() + 1);
      break;
    case 'custom':
      next.setDate(next.getDate() + intervalDays);
      break;
    default:
      next.setMonth(next.getMonth() + 1);
  }
  return next;
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (!authHeader) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

  if (!supabaseUrl || !supabaseServiceKey) {
    return new Response(JSON.stringify({ error: "Server configuration error" }), { status: 500 });
  }

  const supabase = createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  try {
    // Fetch all active recurring schedules
    const { data: schedules, error: fetchError } = await supabase
      .from("recurring_schedules")
      .select("*")
      .eq("active", true)
      .order("next_due_date", { ascending: true });

    if (fetchError) {
      return new Response(JSON.stringify({ error: fetchError.message }), { status: 500 });
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const generated: { scheduleId: string; inspectionId: string }[] = [];
    const updatedSchedules: string[] = [];

    for (const schedule of (schedules || []) as RecurringSchedule[]) {
      const lastGen = schedule.last_generated_date
        ? new Date(schedule.last_generated_date)
        : new Date(schedule.start_date);
      lastGen.setHours(0, 0, 0, 0);

      const nextDue = schedule.next_due_date
        ? new Date(schedule.next_due_date)
        : getNextDate(lastGen, schedule.frequency, schedule.interval_days);
      nextDue.setHours(0, 0, 0, 0);

      // Only generate if next due date is today or past
      if (nextDue > today) continue;

      // Fetch asset details
      const { data: asset } = await supabase
        .from("assets")
        .select("id, customer_id, type, location, name, customer:customers(id, name)")
        .eq("id", schedule.asset_id)
        .single();

      if (!asset) continue;

      // Create the inspection
      const { data: inspection, error: insertError } = await supabase
        .from("inspections")
        .insert({
          asset_id: schedule.asset_id,
          customer_id: schedule.customer_id,
          type: schedule.asset_type,
          status: "scheduled",
          scheduled_date: nextDue.toISOString().split("T")[0],
          location: asset.location || "",
        })
        .select("id")
        .single();

      if (insertError || !inspection) {
        console.error("Failed to create inspection:", insertError);
        continue;
      }

      generated.push({ scheduleId: schedule.id, inspectionId: inspection.id });

      // Calculate next due date
      const newNextDue = getNextDate(nextDue, schedule.frequency, schedule.interval_days);

      // Update the schedule
      const { error: updateError } = await supabase
        .from("recurring_schedules")
        .update({
          last_generated_date: nextDue.toISOString().split("T")[0],
          next_due_date: newNextDue.toISOString().split("T")[0],
          updated_at: new Date().toISOString(),
        })
        .eq("id", schedule.id);

      if (!updateError) {
        updatedSchedules.push(schedule.id);
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        generated: generated.length,
        inspections: generated,
        updated: updatedSchedules.length,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ error: err.message || "Internal server error" }),
      { status: 500 }
    );
  }
});
