export type TemplateLead = {
  firstName?: string | null;
  lastName?: string | null;
  fullName: string;
  email: string;
  company?: string | null;
  role?: string | null;
  website?: string | null;
  location?: string | null;
};

const valueMap = (lead: TemplateLead) => ({
  firstName: lead.firstName || lead.fullName.split(/\s+/)[0] || "there",
  lastName: lead.lastName || "",
  fullName: lead.fullName,
  email: lead.email,
  company: lead.company || "your company",
  role: lead.role || "",
  website: lead.website || "",
  location: lead.location || ""
});

export function renderTemplate(template: string, lead: TemplateLead) {
  const values = valueMap(lead);
  return template.replace(/{{\s*(firstName|lastName|fullName|email|company|role|website|location)\s*}}/g, (_, key: keyof typeof values) => values[key]);
}

export function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?\s*>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();
}
