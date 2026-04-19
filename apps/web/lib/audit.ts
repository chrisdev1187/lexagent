import { supabase } from "@/lib/supabase";

export async function logAudit(
  action: string,
  entityType?: string,
  entityId?: string,
  matterId?: string,
  payload?: Record<string, unknown>,
) {
  await supabase.rpc("log_audit_event", {
    p_action: action,
    p_entity_type: entityType ?? null,
    p_entity_id: entityId ?? null,
    p_matter_id: matterId ?? null,
    p_payload: payload ?? {},
  });
}
