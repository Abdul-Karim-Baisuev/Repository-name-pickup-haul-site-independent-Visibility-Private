import { useEffect, useState } from "react";
import { Loader2, Truck, UserPlus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface Props {
  estimateRequestId: string;
  publicCode: string;
}

type AssignmentRow = {
  id: string;
  stage: string;
  driver_id: string;
  vehicle_label: string | null;
};

const VEHICLE_OPTIONS = [
  { value: "Tacoma", label: "Tacoma TRD · Lumber Rack" },
  { value: "Bronco", label: "Bronco Sport 2025" },
  { value: "Camry", label: "Camry XSE 2025 · Courier" },
];

export const AssignDriverControl = ({ estimateRequestId, publicCode }: Props) => {
  const [loading, setLoading] = useState(true);
  const [working, setWorking] = useState(false);
  const [assignment, setAssignment] = useState<AssignmentRow | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [isDriver, setIsDriver] = useState(false);
  const [vehicle, setVehicle] = useState<string>("Tacoma");

  useEffect(() => {
    let active = true;
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess.session?.user.id ?? null;
      if (!active) return;
      setCurrentUserId(uid);

      if (uid) {
        const { data: roles } = await supabase
          .from("user_roles")
          .select("role")
          .eq("user_id", uid);
        if (active) setIsDriver((roles ?? []).some((r) => r.role === "driver"));
      }

      const { data } = await supabase
        .from("driver_assignments")
        .select("id, stage, driver_id, vehicle_label")
        .eq("estimate_request_id", estimateRequestId)
        .not("stage", "in", "(canceled)")
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (active) {
        setAssignment(data as AssignmentRow | null);
        setLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [estimateRequestId]);

  const ensureDriverRole = async () => {
    if (isDriver) return true;
    const { data, error } = await supabase.rpc("claim_driver_role");
    if (error || data !== true) {
      toast.error("Could not enable driver role", { description: error?.message });
      return false;
    }
    setIsDriver(true);
    return true;
  };

  const assignToMe = async () => {
    if (!currentUserId) return;
    setWorking(true);
    const ok = await ensureDriverRole();
    if (!ok) {
      setWorking(false);
      return;
    }
    const { data, error } = await supabase
      .from("driver_assignments")
      .insert({
        estimate_request_id: estimateRequestId,
        driver_id: currentUserId,
        vehicle_label: vehicle,
      })
      .select("id, stage, driver_id, vehicle_label")
      .single();
    setWorking(false);
    if (error) {
      toast.error("Could not assign", { description: error.message });
      return;
    }
    setAssignment(data as AssignmentRow);
    toast.success(`Assigned ${publicCode} to you`, {
      description: `Vehicle: ${vehicle}. Open /driver on your phone to start.`,
    });
  };

  const cancelAssignment = async () => {
    if (!assignment) return;
    setWorking(true);
    const { error } = await supabase
      .from("driver_assignments")
      .update({ stage: "canceled" })
      .eq("id", assignment.id);
    setWorking(false);
    if (error) {
      toast.error("Could not cancel", { description: error.message });
      return;
    }
    setAssignment(null);
    toast.success("Assignment canceled");
  };

  if (loading) {
    return (
      <div className="text-xs text-muted-foreground inline-flex items-center gap-2">
        <Loader2 className="h-3 w-3 animate-spin" />
        Checking driver…
      </div>
    );
  }

  if (assignment) {
    const mine = assignment.driver_id === currentUserId;
    return (
      <div className="flex flex-wrap items-center gap-2 text-xs">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-500/10 ring-1 ring-emerald-500/30 px-2.5 py-1 text-emerald-300">
          <Truck className="h-3 w-3" />
          {mine ? "Assigned to you" : "Assigned"}
          {assignment.vehicle_label ? ` · ${assignment.vehicle_label}` : ""}
          {" · "}
          {assignment.stage.replace(/_/g, " ")}
        </span>
        <Button size="sm" variant="ghost" disabled={working} onClick={cancelAssignment}>
          {working ? <Loader2 className="h-3 w-3 animate-spin" /> : "Cancel"}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Select value={vehicle} onValueChange={setVehicle}>
        <SelectTrigger className="h-8 w-[180px] text-xs">
          <SelectValue placeholder="Vehicle" />
        </SelectTrigger>
        <SelectContent>
          {VEHICLE_OPTIONS.map((v) => (
            <SelectItem key={v.value} value={v.value} className="text-xs">
              {v.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" variant="outline" disabled={working || !currentUserId} onClick={assignToMe}>
        {working ? <Loader2 className="h-3 w-3 mr-2 animate-spin" /> : <UserPlus className="h-3 w-3 mr-2" />}
        Assign to me
      </Button>
    </div>
  );
};
