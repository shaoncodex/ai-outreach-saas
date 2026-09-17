import { parse } from "csv-parse/sync";

export type ImportedContact = {
  fullName: string;
  firstName?: string;
  lastName?: string;
  email: string;
  company?: string;
  role?: string;
  website?: string;
  location?: string;
};

const aliases: Record<keyof ImportedContact, string[]> = {
  fullName: ["fullname", "full_name", "name", "contactname", "contact_name"],
  firstName: ["firstname", "first_name", "first"],
  lastName: ["lastname", "last_name", "last"],
  email: ["email", "emailaddress", "email_address", "mail"],
  company: ["company", "companyname", "company_name", "business"],
  role: ["role", "title", "jobtitle", "job_title", "position"],
  website: ["website", "url", "domain"],
  location: ["location", "city", "country", "address"]
};

const normalize = (value: string) => value.trim().toLowerCase().replace(/[\s-]+/g, "_");

export function parseContactsCsv(csv: string) {
  const rows = parse(csv, { columns: true, skip_empty_lines: true, trim: true, bom: true, relax_column_count: true }) as Record<string, string>[];
  const seen = new Set<string>();
  const valid: ImportedContact[] = [];
  const invalid: { row: number; reason: string }[] = [];

  rows.forEach((source, index) => {
    const normalized = Object.fromEntries(Object.entries(source).map(([key, value]) => [normalize(key), String(value || "").trim()]));
    const pick = (field: keyof ImportedContact) => aliases[field].map(normalize).map(key => normalized[key]).find(Boolean) || "";
    const email = pick("email").toLowerCase();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      invalid.push({ row: index + 2, reason: "invalid_email" });
      return;
    }
    if (seen.has(email)) {
      invalid.push({ row: index + 2, reason: "duplicate_in_file" });
      return;
    }
    seen.add(email);
    const firstName = pick("firstName");
    const lastName = pick("lastName");
    const fullName = pick("fullName") || [firstName, lastName].filter(Boolean).join(" ") || email.split("@")[0];
    valid.push({ fullName, firstName: firstName || undefined, lastName: lastName || undefined, email, company: pick("company") || undefined, role: pick("role") || undefined, website: pick("website") || undefined, location: pick("location") || undefined });
  });
  return { valid, invalid, totalRows: rows.length };
}
