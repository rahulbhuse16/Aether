// Path: src/store/notificationsSlice.ts
//
// Shared because the unread badge in AppShell's topbar and the dropdown
// panel both need the same data — same reasoning as tasksSlice.

import { createSlice, type PayloadAction } from "@reduxjs/toolkit";

export type NotificationType = "review" | "agent" | "budget" | "meeting";

export interface AppNotification {
  id: string;
  type: NotificationType;
  title: string;
  description: string;
  time: string;
  read: boolean;
  href?: string;
}

type NotificationsState = AppNotification[];

const initialState: NotificationsState = [
  {
    id: "n1",
    type: "agent",
    title: "Code review agent finished",
    description: "PR #42 reviewed — 2 issues flagged, 1 suggestion.",
    time: "2m ago",
    read: false,
    href: "/reviews",
  },
  {
    id: "n2",
    type: "budget",
    title: "AI budget at 80%",
    description: "Aether Core has used 80% of this month's AI credits.",
    time: "1h ago",
    read: false,
    href: "/settings",
  },
  {
    id: "n3",
    type: "meeting",
    title: "Meeting processed",
    description: "\"Sprint planning\" — 4 action items created in Jira.",
    time: "3h ago",
    read: true,
    href: "/meetings",
  },
  {
    id: "n4",
    type: "review",
    title: "New comment on PR #38",
    description: "Reviewer requested changes on the auth middleware.",
    time: "Yesterday",
    read: true,
    href: "/reviews",
  },
];

const notificationsSlice = createSlice({
  name: "notifications",
  initialState,
  reducers: {
    markAsRead: (state, action: PayloadAction<string>) => {
      const n = state.find((n) => n.id === action.payload);
      if (n) n.read = true;
    },
    markAllAsRead: (state) => {
      state.forEach((n) => (n.read = true));
    },
    addNotification: (state, action: PayloadAction<AppNotification>) => {
      state.unshift(action.payload);
    },
  },
});

export const { markAsRead, markAllAsRead, addNotification } = notificationsSlice.actions;
export default notificationsSlice.reducer;