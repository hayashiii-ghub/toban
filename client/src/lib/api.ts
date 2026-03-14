import type { ScheduleDTO, CreateScheduleResponse } from "@/rotation/types";

const BASE = "/api/schedules";

export async function createSchedule(data: {
  name: string;
  rotation: number;
  groups: { id: string; tasks: string[]; emoji: string }[];
  members: { id: string; name: string; color: string; bgColor: string; textColor: string }[];
}): Promise<CreateScheduleResponse> {
  const res = await fetch(BASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to create schedule: ${res.status}`);
  return res.json();
}

export async function getSchedule(slug: string): Promise<ScheduleDTO> {
  const res = await fetch(`${BASE}/${slug}`);
  if (!res.ok) throw new Error(`Failed to fetch schedule: ${res.status}`);
  return res.json();
}

export async function updateSchedule(
  slug: string,
  editToken: string,
  data: {
    name: string;
    rotation: number;
    groups: { id: string; tasks: string[]; emoji: string }[];
    members: { id: string; name: string; color: string; bgColor: string; textColor: string }[];
  },
): Promise<void> {
  const res = await fetch(`${BASE}/${slug}`, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
      "x-edit-token": editToken,
    },
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error(`Failed to update schedule: ${res.status}`);
}

export async function deleteSchedule(slug: string, editToken: string): Promise<void> {
  const res = await fetch(`${BASE}/${slug}`, {
    method: "DELETE",
    headers: { "x-edit-token": editToken },
  });
  if (!res.ok) throw new Error(`Failed to delete schedule: ${res.status}`);
}
