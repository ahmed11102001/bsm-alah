import { redirect } from "next/navigation";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import ConversationAssignmentManager from "./_components/conversation-assignment-manager";

export default async function ConversationAssignmentPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user || !hasPermission(session.user.role, "CHAT_ASSIGN")) redirect("/dashboard/team");
  return <ConversationAssignmentManager />;
}
