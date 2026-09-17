import { db } from "@/lib/db";
import { getSetting } from "@/lib/settings";

const WORKSPACE_NAME = "Shaon Outreach";

export async function getDefaultWorkspace() {
  const existing = await db.workspace.findFirst({ orderBy: { createdAt: "asc" } });
  if (existing) return existing;
  return db.workspace.create({ data: { name: WORKSPACE_NAME } });
}

export async function ensureDefaultMailbox(workspaceId: string) {
  const resourceId = await getSetting("HOSTINGER_MAILBOX_RESOURCE_ID");
  if (!resourceId) return db.mailbox.findFirst({ where: { workspaceId, active: true } });
  const address = await getSetting("HOSTINGER_FROM_ADDRESS", "hello@shaonrahman.com");
  return db.mailbox.upsert({
    where: { workspaceId_resourceId: { workspaceId, resourceId } },
    update: { address: address || "hello@shaonrahman.com", active: true },
    create: { workspaceId, resourceId, address: address || "hello@shaonrahman.com", dailyLimit: 10 }
  });
}
