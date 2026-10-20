import "server-only";

import { hasPermission } from "@/lib/auth/permissions";
import {
  broadUtcMonthRange,
  instantDateKey,
  shiftCalendarMonth,
} from "@/lib/crm/calendar";
import { createClient } from "@/lib/supabase/server";
import { requirePermission, type Viewer } from "@/server/auth/session";

const PAGE_SIZE = 25;

type QueryOptions = {
  query?: string;
  page?: number;
};

type OpportunityQueryOptions = QueryOptions & {
  stage?: string;
};

type CustomerRow = {
  id: string;
  full_name: string;
  customer_type: string;
  phone_e164: string;
  email: string | null;
  affiliation_name: string | null;
  district: string | null;
  city: string | null;
  preferred_contact_channel: string;
  internal_notes: string | null;
  assigned_to: string;
  created_at: string;
  updated_at: string;
};

type OpportunityRow = {
  id: string;
  opportunity_code: string;
  customer_id: string;
  event_type_id: string | null;
  assigned_to: string;
  pipeline_status: string;
  desired_date: string | null;
  occasion_detail?: string | null;
  guests_total: number | null;
  modality: string | null;
  source: string;
  next_action: string | null;
  next_action_at: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
};

type ProfileNameRow = { user_id: string; full_name: string };
type EventTypeRow = { id: string; name: string; slug: string };

function unique(values: Array<string | null | undefined>) {
  return [...new Set(values.filter((value): value is string => Boolean(value)))];
}

function maskPhone(value: string) {
  const digits = value.replace(/\D/g, "");
  if (digits.length <= 4) return "••••";
  return `••• ••• ${digits.slice(-4)}`;
}

function maskDocument(value: string) {
  return `•••• ${value.slice(-4)}`;
}

function safePage(value?: number) {
  return Number.isInteger(value) && value && value > 0 ? value : 1;
}

function sanitizeSearch(value?: string) {
  return value?.trim().replace(/[^\p{L}\p{N}+@.' -]/gu, "").slice(0, 80) ?? "";
}

async function nameMaps(
  viewer: Viewer,
  customerIds: string[],
  eventTypeIds: string[],
  adviserIds: string[],
) {
  const supabase = await createClient();
  const [customersResult, eventTypesResult, profilesResult] = await Promise.all([
    customerIds.length
      ? supabase
          .from("customers")
          .select("id, full_name")
          .eq("organization_id", viewer.organizationId)
          .in("id", customerIds)
      : Promise.resolve({ data: [], error: null }),
    eventTypeIds.length
      ? supabase
          .from("event_types")
          .select("id, name, slug")
          .eq("organization_id", viewer.organizationId)
          .in("id", eventTypeIds)
      : Promise.resolve({ data: [], error: null }),
    adviserIds.length
      ? supabase
          .from("profiles")
          .select("user_id, full_name")
          .eq("organization_id", viewer.organizationId)
          .in("user_id", adviserIds)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (customersResult.error || eventTypesResult.error || profilesResult.error) {
    throw new Error("No se pudieron completar los datos comerciales.");
  }

  return {
    customers: new Map(
      (customersResult.data ?? []).map((row) => [row.id as string, row.full_name as string]),
    ),
    eventTypes: new Map(
      ((eventTypesResult.data ?? []) as EventTypeRow[]).map((row) => [row.id, row.name]),
    ),
    advisers: new Map(
      ((profilesResult.data ?? []) as ProfileNameRow[]).map((row) => [row.user_id, row.full_name]),
    ),
  };
}

export async function listCustomers(options: QueryOptions = {}) {
  const viewer = await requirePermission("crm:view");
  const supabase = await createClient();
  const page = safePage(options.page);
  const search = sanitizeSearch(options.query);
  const from = (page - 1) * PAGE_SIZE;
  let query = supabase
    .from("customers")
    .select(
      "id, full_name, customer_type, phone_e164, email, affiliation_name, district, city, preferred_contact_channel, internal_notes, assigned_to, created_at, updated_at",
      { count: "exact" },
    )
    .eq("organization_id", viewer.organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (search) {
    const digits = search.replace(/\D/g, "");
    query = digits.length >= 4
      ? query.ilike("phone_e164", `%${digits}%`)
      : query.ilike("full_name", `%${search}%`);
  }

  const { data, error, count } = await query;
  if (error) throw new Error("No se pudo consultar la lista de clientes.");

  const rows = (data ?? []) as CustomerRow[];
  const adviserIds = unique(rows.map((row) => row.assigned_to));
  const maps = await nameMaps(viewer, [], [], adviserIds);

  return {
    items: rows.map((row) => ({
      id: row.id,
      fullName: row.full_name,
      customerType: row.customer_type,
      maskedPhone: maskPhone(row.phone_e164),
      affiliationName: row.affiliation_name,
      location: [row.district, row.city].filter(Boolean).join(", ") || null,
      assignedToName: maps.advisers.get(row.assigned_to) ??
        (row.assigned_to === viewer.userId ? viewer.fullName : "Asesor autorizado"),
      updatedAt: row.updated_at,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function listOpportunities(options: OpportunityQueryOptions = {}) {
  const viewer = await requirePermission("crm:view");
  const supabase = await createClient();
  const page = safePage(options.page);
  const search = sanitizeSearch(options.query);
  const from = (page - 1) * PAGE_SIZE;
  let customerIds: string[] | null = null;

  if (search) {
    const digits = search.replace(/\D/g, "");
    let customerQuery = supabase
      .from("customers")
      .select("id")
      .eq("organization_id", viewer.organizationId)
      .is("archived_at", null)
      .limit(50);
    customerQuery = digits.length >= 4
      ? customerQuery.ilike("phone_e164", `%${digits}%`)
      : customerQuery.ilike("full_name", `%${search}%`);
    const customerResult = await customerQuery;
    if (customerResult.error) throw new Error("No se pudo ejecutar la búsqueda.");
    customerIds = (customerResult.data ?? []).map((row) => row.id as string);
    if (customerIds.length === 0) {
      return { items: [], total: 0, page, pageSize: PAGE_SIZE };
    }
  }

  let query = supabase
    .from("opportunities")
    .select(
      "id, opportunity_code, customer_id, event_type_id, assigned_to, pipeline_status, desired_date, occasion_detail, guests_total, modality, source, next_action, next_action_at, notes, created_at, updated_at",
      { count: "exact" },
    )
    .eq("organization_id", viewer.organizationId)
    .is("archived_at", null)
    .order("updated_at", { ascending: false })
    .range(from, from + PAGE_SIZE - 1);

  if (customerIds) query = query.in("customer_id", customerIds);
  if (options.stage) query = query.eq("pipeline_status", options.stage);

  const { data, error, count } = await query;
  if (error) throw new Error("No se pudo consultar el CRM.");
  const rows = (data ?? []) as OpportunityRow[];
  const maps = await nameMaps(
    viewer,
    unique(rows.map((row) => row.customer_id)),
    unique(rows.map((row) => row.event_type_id)),
    unique(rows.map((row) => row.assigned_to)),
  );

  return {
    items: rows.map((row) => ({
      id: row.id,
      code: row.opportunity_code,
      customerId: row.customer_id,
      customerName: maps.customers.get(row.customer_id) ?? "Cliente autorizado",
      eventType: row.event_type_id
        ? maps.eventTypes.get(row.event_type_id) ?? "Evento por definir"
        : "Evento por definir",
      adviserName: maps.advisers.get(row.assigned_to) ??
        (row.assigned_to === viewer.userId ? viewer.fullName : "Asesor autorizado"),
      stage: row.pipeline_status,
      desiredDate: row.desired_date,
      guestsTotal: row.guests_total,
      modality: row.modality,
      nextAction: row.next_action,
      nextActionAt: row.next_action_at,
      updatedAt: row.updated_at,
    })),
    total: count ?? 0,
    page,
    pageSize: PAGE_SIZE,
  };
}

export async function getCrmDashboard() {
  const viewer = await requirePermission("crm:view");
  const supabase = await createClient();
  const now = new Date().toISOString();
  const inSevenDays = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString();

  const [customers, openOpportunities, pendingTasks, upcomingVisits, recent] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", viewer.organizationId)
        .is("archived_at", null),
      supabase
        .from("opportunities")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", viewer.organizationId)
        .is("archived_at", null)
        .not("pipeline_status", "in", "(ganado,perdido,descartado)"),
      supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", viewer.organizationId)
        .in("status", ["pendiente", "en_progreso"])
        .lte("due_at", inSevenDays),
      supabase
        .from("visits")
        .select("id", { count: "exact", head: true })
        .eq("organization_id", viewer.organizationId)
        .eq("status", "programada")
        .gte("start_at", now)
        .lte("start_at", inSevenDays),
      listOpportunities({ page: 1 }),
    ]);

  if (
    customers.error ||
    openOpportunities.error ||
    pendingTasks.error ||
    upcomingVisits.error
  ) {
    throw new Error("No se pudo consultar el resumen comercial.");
  }

  return {
    scope: viewer.roles.some((role) =>
      ["SUPERADMIN", "ADMINISTRADOR"].includes(role),
    )
      ? "global"
      : "propio",
    customers: customers.count ?? 0,
    openOpportunities: openOpportunities.count ?? 0,
    pendingTasks: pendingTasks.count ?? 0,
    upcomingVisits: upcomingVisits.count ?? 0,
    recentOpportunities: recent.items.slice(0, 5),
  };
}

export async function getCrmFormOptions() {
  const viewer = await requirePermission("crm:create");
  const supabase = await createClient();
  const [eventTypes, profiles, roles] = await Promise.all([
    supabase
      .from("event_types")
      .select("id, name, slug")
      .eq("organization_id", viewer.organizationId)
      .eq("active", true)
      .order("sort_order"),
    supabase
      .from("profiles")
      .select("user_id, full_name")
      .eq("organization_id", viewer.organizationId)
      .eq("status", "active")
      .order("full_name"),
    supabase
      .from("user_roles")
      .select("user_id, role")
      .eq("organization_id", viewer.organizationId),
  ]);

  if (eventTypes.error || profiles.error || roles.error) {
    throw new Error("No se pudo preparar el formulario comercial.");
  }

  const allowedAdvisers = new Set(
    (roles.data ?? [])
      .filter((row) => ["SUPERADMIN", "ADMINISTRADOR", "COMERCIAL"].includes(row.role as string))
      .map((row) => row.user_id as string),
  );
  const canAssign = viewer.roles.some((role) =>
    ["SUPERADMIN", "ADMINISTRADOR"].includes(role),
  );
  const advisers = ((profiles.data ?? []) as ProfileNameRow[])
    .filter((profile) => allowedAdvisers.has(profile.user_id))
    .filter((profile) => canAssign || profile.user_id === viewer.userId)
    .map((profile) => ({ id: profile.user_id, name: profile.full_name }));

  if (!advisers.some((adviser) => adviser.id === viewer.userId)) {
    advisers.push({ id: viewer.userId, name: viewer.fullName });
  }

  return {
    eventTypes: (eventTypes.data ?? []) as EventTypeRow[],
    advisers,
    defaultAdviserId: viewer.userId,
    canAssign,
  };
}

export async function getCustomerDetail(customerId: string) {
  const viewer = await requirePermission("crm:view");
  const supabase = await createClient();
  const [customerResult, identifiersResult, opportunitiesResult] = await Promise.all([
    supabase
      .from("customers")
      .select(
        "id, full_name, customer_type, phone_e164, email, affiliation_name, district, city, preferred_contact_channel, internal_notes, assigned_to, created_at, updated_at",
      )
      .eq("organization_id", viewer.organizationId)
      .eq("id", customerId)
      .is("archived_at", null)
      .maybeSingle(),
    supabase
      .from("customer_identifiers")
      .select("id, document_type, document_number_normalized")
      .eq("organization_id", viewer.organizationId)
      .eq("customer_id", customerId)
      .is("archived_at", null),
    supabase
      .from("opportunities")
      .select(
        "id, opportunity_code, customer_id, event_type_id, assigned_to, pipeline_status, desired_date, guests_total, modality, source, next_action, next_action_at, notes, created_at, updated_at",
      )
      .eq("organization_id", viewer.organizationId)
      .eq("customer_id", customerId)
      .is("archived_at", null)
      .order("created_at", { ascending: false }),
  ]);

  if (customerResult.error || identifiersResult.error || opportunitiesResult.error) {
    throw new Error("No se pudo consultar la ficha del cliente.");
  }
  if (!customerResult.data) return null;

  const customer = customerResult.data as CustomerRow;
  const opportunityRows = (opportunitiesResult.data ?? []) as OpportunityRow[];
  const maps = await nameMaps(
    viewer,
    [],
    unique(opportunityRows.map((row) => row.event_type_id)),
    unique([customer.assigned_to, ...opportunityRows.map((row) => row.assigned_to)]),
  );

  return {
    id: customer.id,
    fullName: customer.full_name,
    customerType: customer.customer_type,
    phone: customer.phone_e164,
    email: customer.email,
    affiliationName: customer.affiliation_name,
    location: [customer.district, customer.city].filter(Boolean).join(", ") || null,
    preferredContactChannel: customer.preferred_contact_channel,
    internalNotes: customer.internal_notes,
    adviserName: maps.advisers.get(customer.assigned_to) ?? viewer.fullName,
    identifiers: (identifiersResult.data ?? []).map((row) => ({
      id: row.id as string,
      type: row.document_type as string,
      maskedNumber: maskDocument(row.document_number_normalized as string),
    })),
    opportunities: opportunityRows.map((row) => ({
      id: row.id,
      code: row.opportunity_code,
      stage: row.pipeline_status,
      desiredDate: row.desired_date,
      guestsTotal: row.guests_total,
      eventType: row.event_type_id
        ? maps.eventTypes.get(row.event_type_id) ?? "Evento por definir"
        : "Evento por definir",
      adviserName: maps.advisers.get(row.assigned_to) ?? viewer.fullName,
    })),
    createdAt: customer.created_at,
    updatedAt: customer.updated_at,
  };
}

export async function getOpportunityDetail(opportunityId: string) {
  const viewer = await requirePermission("crm:view");
  const supabase = await createClient();
  const opportunityResult = await supabase
    .from("opportunities")
    .select(
      "id, opportunity_code, customer_id, event_type_id, assigned_to, pipeline_status, desired_date, occasion_detail, guests_total, modality, source, next_action, next_action_at, notes, created_at, updated_at",
    )
    .eq("organization_id", viewer.organizationId)
    .eq("id", opportunityId)
    .is("archived_at", null)
    .maybeSingle();

  if (opportunityResult.error) throw new Error("No se pudo consultar la oportunidad.");
  if (!opportunityResult.data) return null;
  const opportunity = opportunityResult.data as OpportunityRow;

  const [customerResult, activities, tasks, visits, proposals, services] =
    await Promise.all([
      supabase
        .from("customers")
        .select("id, full_name, phone_e164, email")
        .eq("organization_id", viewer.organizationId)
        .eq("id", opportunity.customer_id)
        .maybeSingle(),
      supabase
        .from("crm_activities")
        .select("id, kind, description, author_id, occurred_at")
        .eq("organization_id", viewer.organizationId)
        .eq("opportunity_id", opportunityId)
        .order("occurred_at", { ascending: false })
        .limit(50),
      supabase
        .from("tasks")
        .select("id, type, title, description, due_at, priority, status, result, assignee_id, updated_at")
        .eq("organization_id", viewer.organizationId)
        .eq("opportunity_id", opportunityId)
        .order("due_at", { ascending: true })
        .limit(50),
      supabase
        .from("visits")
        .select("id, start_at, end_at, mode, participants_count, status, notes, outcome, next_steps, staff_id, updated_at")
        .eq("organization_id", viewer.organizationId)
        .eq("opportunity_id", opportunityId)
        .order("start_at", { ascending: false })
        .limit(50),
      supabase
        .from("opportunity_proposals")
        .select("id, services_summary, amount_cents, currency, notes, recorded_by, created_at")
        .eq("organization_id", viewer.organizationId)
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false })
        .limit(10),
      supabase
        .from("opportunity_service_interests")
        .select("id, service_label, quantity, unit, details")
        .eq("organization_id", viewer.organizationId)
        .eq("opportunity_id", opportunityId)
        .eq("active", true)
        .order("service_label"),
    ]);

  if (
    customerResult.error ||
    activities.error ||
    tasks.error ||
    visits.error ||
    proposals.error ||
    services.error
  ) {
    throw new Error("No se pudo completar el detalle de la oportunidad.");
  }

  const peopleIds = unique([
    opportunity.assigned_to,
    ...(activities.data ?? []).map((row) => row.author_id as string),
    ...(tasks.data ?? []).map((row) => row.assignee_id as string),
    ...(visits.data ?? []).map((row) => row.staff_id as string),
    ...(proposals.data ?? []).map((row) => row.recorded_by as string),
  ]);
  const maps = await nameMaps(
    viewer,
    [],
    unique([opportunity.event_type_id]),
    peopleIds,
  );

  return {
    id: opportunity.id,
    code: opportunity.opportunity_code,
    stage: opportunity.pipeline_status,
    desiredDate: opportunity.desired_date,
    occasionDetail: opportunity.occasion_detail ?? null,
    guestsTotal: opportunity.guests_total,
    modality: opportunity.modality,
    source: opportunity.source,
    nextAction: opportunity.next_action,
    nextActionAt: opportunity.next_action_at,
    notes: opportunity.notes,
    updatedAt: opportunity.updated_at,
    customer: customerResult.data
      ? {
          id: customerResult.data.id as string,
          fullName: customerResult.data.full_name as string,
          phone: customerResult.data.phone_e164 as string,
          email: customerResult.data.email as string | null,
        }
      : null,
    eventType: opportunity.event_type_id
      ? maps.eventTypes.get(opportunity.event_type_id) ?? "Evento por definir"
      : "Evento por definir",
    adviserName: maps.advisers.get(opportunity.assigned_to) ?? viewer.fullName,
    activities: (activities.data ?? []).map((row) => ({
      id: row.id as string,
      kind: row.kind as string,
      description: row.description as string,
      authorName: maps.advisers.get(row.author_id as string) ?? "Usuario autorizado",
      occurredAt: row.occurred_at as string,
    })),
    tasks: (tasks.data ?? []).map((row) => ({
      id: row.id as string,
      type: row.type as string,
      title: row.title as string,
      description: row.description as string | null,
      dueAt: row.due_at as string,
      priority: row.priority as string,
      status: row.status as string,
      result: row.result as string | null,
      updatedAt: row.updated_at as string,
      assigneeName: maps.advisers.get(row.assignee_id as string) ?? "Usuario autorizado",
    })),
    visits: (visits.data ?? []).map((row) => ({
      id: row.id as string,
      startAt: row.start_at as string,
      endAt: row.end_at as string,
      mode: row.mode as string,
      participantsCount: row.participants_count as number | null,
      status: row.status as string,
      notes: row.notes as string | null,
      outcome: row.outcome as string | null,
      nextSteps: row.next_steps as string | null,
      updatedAt: row.updated_at as string,
      staffName: maps.advisers.get(row.staff_id as string) ?? "Usuario autorizado",
    })),
    proposals: (proposals.data ?? []).map((row) => ({
      id: row.id as string,
      servicesSummary: row.services_summary as string,
      amountCents: row.amount_cents as number,
      currency: row.currency as string,
      notes: row.notes as string | null,
      recordedByName: maps.advisers.get(row.recorded_by as string) ?? "Usuario autorizado",
      createdAt: row.created_at as string,
    })),
    serviceInterests: (services.data ?? []).map((row) => ({
      id: row.id as string,
      label: row.service_label as string,
      quantity: row.quantity as number | null,
      unit: row.unit as string | null,
      details: row.details as string | null,
    })),
  };
}

export async function listCrmTasks() {
  const viewer = await requirePermission("tasks:view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("tasks")
    .select("id, customer_id, opportunity_id, type, title, due_at, priority, status, result, assignee_id")
    .eq("organization_id", viewer.organizationId)
    .order("due_at", { ascending: true })
    .limit(100);
  if (error) throw new Error("No se pudieron consultar las tareas.");
  const rows = data ?? [];
  const maps = await nameMaps(
    viewer,
    unique(rows.map((row) => row.customer_id as string)),
    [],
    unique(rows.map((row) => row.assignee_id as string)),
  );
  return rows.map((row) => ({
    id: row.id as string,
    opportunityId: row.opportunity_id as string,
    customerName: maps.customers.get(row.customer_id as string) ?? "Cliente autorizado",
    type: row.type as string,
    title: row.title as string,
    dueAt: row.due_at as string,
    priority: row.priority as string,
    status: row.status as string,
    result: row.result as string | null,
    assigneeName: maps.advisers.get(row.assignee_id as string) ?? viewer.fullName,
  }));
}

export async function listCrmVisits() {
  const viewer = await requirePermission("visits:view");
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("visits")
    .select("id, customer_id, opportunity_id, start_at, end_at, mode, participants_count, status, outcome, staff_id")
    .eq("organization_id", viewer.organizationId)
    .order("start_at", { ascending: true })
    .limit(100);
  if (error) throw new Error("No se pudieron consultar las visitas.");
  const rows = data ?? [];
  const maps = await nameMaps(
    viewer,
    unique(rows.map((row) => row.customer_id as string)),
    [],
    unique(rows.map((row) => row.staff_id as string)),
  );
  return rows.map((row) => ({
    id: row.id as string,
    opportunityId: row.opportunity_id as string,
    customerName: maps.customers.get(row.customer_id as string) ?? "Cliente autorizado",
    startAt: row.start_at as string,
    endAt: row.end_at as string,
    mode: row.mode as string,
    participantsCount: row.participants_count as number | null,
    status: row.status as string,
    outcome: row.outcome as string | null,
    staffName: maps.advisers.get(row.staff_id as string) ?? viewer.fullName,
  }));
}

export async function getCrmCalendarMonth(month: string) {
  const viewer = await requirePermission("crm:view");
  const supabase = await createClient();
  const range = broadUtcMonthRange(month);
  const firstDate = `${month}-01`;
  const nextMonthStart = `${shiftCalendarMonth(month, 1)}-01`;
  const canViewTasks = hasPermission(viewer.roles, "tasks:view");
  const canViewVisits = hasPermission(viewer.roles, "visits:view");

  const [opportunitiesResult, tasksResult, visitsResult] = await Promise.all([
    supabase
      .from("opportunities")
      .select(
        "id, opportunity_code, customer_id, event_type_id, assigned_to, pipeline_status, desired_date, occasion_detail, guests_total, updated_at",
      )
      .eq("organization_id", viewer.organizationId)
      .is("archived_at", null)
      .gte("desired_date", firstDate)
      .lt("desired_date", nextMonthStart)
      .not("pipeline_status", "in", "(perdido,descartado)"),
    canViewTasks
      ? supabase
          .from("tasks")
          .select("id, opportunity_id, customer_id, assignee_id, type, title, due_at, status")
          .eq("organization_id", viewer.organizationId)
          .in("status", ["pendiente", "en_progreso"])
          .gte("due_at", range.start)
          .lt("due_at", range.end)
      : Promise.resolve({ data: [], error: null }),
    canViewVisits
      ? supabase
          .from("visits")
          .select("id, opportunity_id, customer_id, staff_id, start_at, end_at, mode, status")
          .eq("organization_id", viewer.organizationId)
          .eq("status", "programada")
          .gte("start_at", range.start)
          .lt("start_at", range.end)
      : Promise.resolve({ data: [], error: null }),
  ]);

  if (opportunitiesResult.error || tasksResult.error || visitsResult.error) {
    throw new Error("No se pudo consultar la agenda comercial.");
  }

  const opportunityRows = (opportunitiesResult.data ?? []) as Array<{
    id: string;
    opportunity_code: string;
    customer_id: string;
    event_type_id: string | null;
    assigned_to: string;
    pipeline_status: string;
    desired_date: string;
    occasion_detail: string | null;
    guests_total: number | null;
    updated_at: string;
  }>;
  const taskRows = (tasksResult.data ?? []) as Array<{
    id: string;
    opportunity_id: string;
    customer_id: string;
    assignee_id: string;
    type: string;
    title: string;
    due_at: string;
    status: string;
  }>;
  const visitRows = (visitsResult.data ?? []) as Array<{
    id: string;
    opportunity_id: string;
    customer_id: string;
    staff_id: string;
    start_at: string;
    end_at: string;
    mode: string;
    status: string;
  }>;

  const maps = await nameMaps(
    viewer,
    unique([
      ...opportunityRows.map((row) => row.customer_id),
      ...taskRows.map((row) => row.customer_id),
      ...visitRows.map((row) => row.customer_id),
    ]),
    unique(opportunityRows.map((row) => row.event_type_id)),
    unique([
      ...opportunityRows.map((row) => row.assigned_to),
      ...taskRows.map((row) => row.assignee_id),
      ...visitRows.map((row) => row.staff_id),
    ]),
  );

  const requestedDates = opportunityRows.map((row) => ({
    id: `opportunity-${row.id}`,
    kind: "solicitud" as const,
    dateKey: row.desired_date,
    startsAt: null,
    opportunityId: row.id,
    title: maps.customers.get(row.customer_id) ?? "Cliente autorizado",
    detail: `${row.occasion_detail || (row.event_type_id ? maps.eventTypes.get(row.event_type_id) : null) || "Evento por definir"} · ${row.guests_total ?? "—"} invitados`,
    status: row.pipeline_status,
    adviserName: maps.advisers.get(row.assigned_to) ?? viewer.fullName,
  }));
  const tasks = taskRows
    .map((row) => ({
      id: `task-${row.id}`,
      kind: "tarea" as const,
      dateKey: instantDateKey(row.due_at, viewer.timezone),
      startsAt: row.due_at,
      opportunityId: row.opportunity_id,
      title: row.title,
      detail: maps.customers.get(row.customer_id) ?? "Cliente autorizado",
      status: row.status,
      adviserName: maps.advisers.get(row.assignee_id) ?? viewer.fullName,
    }))
    .filter((entry) => entry.dateKey.startsWith(`${month}-`));
  const visits = visitRows
    .map((row) => ({
      id: `visit-${row.id}`,
      kind: "visita" as const,
      dateKey: instantDateKey(row.start_at, viewer.timezone),
      startsAt: row.start_at,
      opportunityId: row.opportunity_id,
      title: maps.customers.get(row.customer_id) ?? "Cliente autorizado",
      detail: `Visita ${row.mode}`,
      status: row.status,
      adviserName: maps.advisers.get(row.staff_id) ?? viewer.fullName,
    }))
    .filter((entry) => entry.dateKey.startsWith(`${month}-`));

  return {
    month,
    timezone: viewer.timezone,
    canCreate: hasPermission(viewer.roles, "crm:create"),
    entries: [...requestedDates, ...visits, ...tasks].sort((left, right) => {
      if (left.dateKey !== right.dateKey) return left.dateKey.localeCompare(right.dateKey);
      return (left.startsAt ?? "").localeCompare(right.startsAt ?? "");
    }),
    counts: {
      requestedDates: requestedDates.length,
      visits: visits.length,
      tasks: tasks.length,
    },
  };
}

