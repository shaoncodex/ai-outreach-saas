export type PolicyInput = {
  email: string;
  suppressed?: boolean;
  replied?: boolean;
  campaignActive?: boolean;
  sentToday?: number;
  dailyLimit?: number;
};

export function canSendOutreach(input: PolicyInput) {
  const reasons: string[] = [];
  if (!input.email?.includes("@")) reasons.push("invalid_email");
  if (input.suppressed) reasons.push("suppressed");
  if (input.replied) reasons.push("already_replied");
  if (input.campaignActive === false) reasons.push("campaign_inactive");
  if ((input.sentToday ?? 0) >= (input.dailyLimit ?? 40)) reasons.push("daily_limit_reached");
  return { allowed: reasons.length === 0, reasons };
}
