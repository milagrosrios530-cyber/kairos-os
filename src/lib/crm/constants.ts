export const CUSTOMER_TYPES = [
  "persona",
  "empresa",
  "comite",
  "institucion",
] as const;

export type CustomerType = (typeof CUSTOMER_TYPES)[number];

export const CUSTOMER_TYPE_LABELS: Record<CustomerType, string> = {
  persona: "Persona",
  empresa: "Empresa",
  comite: "Comité",
  institucion: "Institución",
};

export const DOCUMENT_TYPES = ["dni", "ce", "pasaporte", "ruc", "otro"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const DOCUMENT_TYPE_LABELS: Record<DocumentType, string> = {
  dni: "DNI",
  ce: "Carnet de extranjería",
  pasaporte: "Pasaporte",
  ruc: "RUC",
  otro: "Otro documento",
};

export const CONTACT_CHANNELS = ["whatsapp", "llamada", "correo"] as const;
export type ContactChannel = (typeof CONTACT_CHANNELS)[number];

export const CONTACT_CHANNEL_LABELS: Record<ContactChannel, string> = {
  whatsapp: "WhatsApp",
  llamada: "Llamada",
  correo: "Correo",
};

export const EVENT_MODALITIES = [
  "solo_local",
  "integral",
  "personalizado",
  "corporativo",
] as const;
export type EventModality = (typeof EVENT_MODALITIES)[number];

export const EVENT_MODALITY_LABELS: Record<EventModality, string> = {
  solo_local: "Solo local",
  integral: "Integral",
  personalizado: "Personalizado",
  corporativo: "Corporativo",
};

export const LEAD_SOURCES = [
  "facebook_ads",
  "instagram",
  "whatsapp",
  "referido",
  "visita_presencial",
  "web_disponibilidad",
  "otro",
] as const;
export type LeadSource = (typeof LEAD_SOURCES)[number];

export const LEAD_SOURCE_LABELS: Record<LeadSource, string> = {
  facebook_ads: "Facebook Ads",
  instagram: "Instagram",
  whatsapp: "WhatsApp",
  referido: "Referido",
  visita_presencial: "Visita presencial",
  web_disponibilidad: "Web de disponibilidad",
  otro: "Otro",
};

export const PIPELINE_STATUSES = [
  "nuevo",
  "contactado",
  "calificado",
  "visita_programada",
  "visita_realizada",
  "cotizacion_enviada",
  "negociacion",
  "ganado",
  "perdido",
  "descartado",
] as const;
export type PipelineStatus = (typeof PIPELINE_STATUSES)[number];

export const PIPELINE_STATUS_LABELS: Record<PipelineStatus, string> = {
  nuevo: "Nuevo",
  contactado: "Contactado",
  calificado: "Calificado",
  visita_programada: "Visita programada",
  visita_realizada: "Visita realizada",
  cotizacion_enviada: "Cotización enviada",
  negociacion: "Negociación",
  ganado: "Ganado",
  perdido: "Perdido",
  descartado: "Descartado",
};

export const CRM_ACTIVITY_KINDS = [
  "nota",
  "llamada",
  "whatsapp_manual",
  "reunion",
] as const;
export type CrmActivityKind = (typeof CRM_ACTIVITY_KINDS)[number];

export const TASK_TYPES = [
  "llamada",
  "whatsapp",
  "visita",
  "enviar_cotizacion",
  "verificar_pago",
  "otro",
] as const;
export type TaskType = (typeof TASK_TYPES)[number];

export const TASK_PRIORITIES = ["baja", "media", "alta", "urgente"] as const;
export type TaskPriority = (typeof TASK_PRIORITIES)[number];

export const TASK_STATUSES = [
  "pendiente",
  "en_progreso",
  "completada",
  "cancelada",
] as const;
export type TaskStatus = (typeof TASK_STATUSES)[number];

export const VISIT_MODALITIES = ["presencial", "virtual", "telefonica"] as const;
export type VisitModality = (typeof VISIT_MODALITIES)[number];

export const VISIT_STATUSES = [
  "programada",
  "realizada",
  "no_asistio",
  "reprogramada",
  "cancelada",
] as const;
export type VisitStatus = (typeof VISIT_STATUSES)[number];

export const OPPORTUNITY_DATE_NATURE = "tentativa" as const;
export const PROPOSED_PRICE_NATURE = "referencial" as const;
export const CRM_CURRENCY = "PEN" as const;
