// Validation des données d'un dossier contre le formulaire configuré pour la démarche (§4.4, §5.6).

export type FieldType = 'text' | 'textarea' | 'number' | 'date' | 'email' | 'phone' | 'select' | 'boolean';

export interface FormField {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  options?: string[];
  maxLength?: number;
}

export interface FormSchema {
  fields: FormField[];
}

const DEFAULT_MAX_LENGTH = { text: 255, textarea: 5000 };

export function validateFormData(
  schema: unknown,
  data: Record<string, unknown>,
): { value: Record<string, unknown>; errors: string[] } {
  const fields = (schema as FormSchema | null)?.fields ?? [];
  const known = new Set(fields.map((f) => f.name));
  const errors: string[] = [];
  const value: Record<string, unknown> = {};

  for (const key of Object.keys(data)) {
    if (!known.has(key)) errors.push(`Champ inconnu : ${key}`);
  }

  for (const field of fields) {
    let v = data[field.name];
    if (typeof v === 'string') v = v.trim();
    if (v === undefined || v === null || v === '') {
      if (field.required) errors.push(`${field.label} est obligatoire`);
      continue;
    }
    const error = checkField(field, v);
    if (error) errors.push(error);
    else value[field.name] = v;
  }

  return { value, errors };
}

function checkField(f: FormField, v: unknown): string | null {
  switch (f.type) {
    case 'text':
    case 'textarea': {
      if (typeof v !== 'string') return `${f.label} doit être un texte`;
      const max = f.maxLength ?? DEFAULT_MAX_LENGTH[f.type];
      return v.length > max ? `${f.label} ne doit pas dépasser ${max} caractères` : null;
    }
    case 'number':
      return typeof v === 'number' && Number.isFinite(v) ? null : `${f.label} doit être un nombre`;
    case 'boolean':
      return typeof v === 'boolean' ? null : `${f.label} doit valoir vrai ou faux`;
    case 'date':
      return typeof v === 'string' && isIsoDate(v) ? null : `${f.label} doit être une date au format AAAA-MM-JJ`;
    case 'email':
      return typeof v === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v) ? null : `${f.label} doit être une adresse e-mail valide`;
    case 'phone':
      return typeof v === 'string' && /^\+?[0-9 ]{8,15}$/.test(v) ? null : `${f.label} doit être un numéro de téléphone valide`;
    case 'select':
      return typeof v === 'string' && (f.options ?? []).includes(v) ? null : `${f.label} : valeur non autorisée`;
    default:
      return `${f.label} : type de champ non pris en charge`;
  }
}

function isIsoDate(v: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}
