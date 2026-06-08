import {
  getUsers,
  getNotificationAudienceStats,
  adminBroadcastNotification,
  type NotificationAudienceStats,
  type AdminBroadcastPayload,
  type AdminBroadcastResult,
  type UserListItem
} from "../../api/admin";

export {
  getNotificationAudienceStats,
  adminBroadcastNotification,
  type NotificationAudienceStats,
  type AdminBroadcastPayload,
  type AdminBroadcastResult,
  type UserListItem
};

export async function searchApprovedUsers(q: string): Promise<UserListItem[]> {
  if (q.trim().length < 2) return [];
  const res = await getUsers(1, 25, "APPROVED", q);
  return res.users ?? [];
}
