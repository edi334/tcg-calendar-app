import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "../state/auth";
import { useToast } from "../state/toast";
import type { EventType, Game, SearchMeta, TcgEvent, Trip, User } from "../types";

const API_URL = process.env.EXPO_PUBLIC_API_URL ?? "http://localhost:4000";

export interface EventFilters {
  games?: Game[];
  types?: EventType[];
}

async function fetchJson<T>(path: string): Promise<T> {
  const res = await fetch(`${API_URL}${path}`);
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with ${res.status}`);
  }
  return res.json() as Promise<T>;
}

async function authedFetchJson<T>(path: string, token: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...init,
    headers: { "Content-Type": "application/json", ...init?.headers, Authorization: `Bearer ${token}` },
  });
  if (!res.ok) {
    throw new Error(`Request to ${path} failed with ${res.status}`);
  }
  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}

function buildEventsQuery(filters: EventFilters): string {
  const params = new URLSearchParams();
  if (filters.games?.length) params.set("game", filters.games.join(","));
  if (filters.types?.length) params.set("type", filters.types.join(","));
  const qs = params.toString();
  return qs ? `/api/events?${qs}` : "/api/events";
}

export function useEvents(filters: EventFilters) {
  return useQuery({
    queryKey: ["events", filters],
    queryFn: () => fetchJson<TcgEvent[]>(buildEventsQuery(filters)),
    staleTime: 5 * 60 * 1000,
  });
}

export function useEvent(id: string | undefined) {
  return useQuery({
    queryKey: ["event", id],
    queryFn: () => fetchJson<TcgEvent>(`/api/events/${id}`),
    enabled: !!id,
  });
}

export function useMeta() {
  return useQuery({
    queryKey: ["meta"],
    queryFn: () => fetchJson<SearchMeta>("/api/meta"),
    staleTime: Infinity,
  });
}

export interface AddressSuggestion {
  label: string;
}

export function useAddressSearch(query: string) {
  return useQuery({
    queryKey: ["geocode", query],
    queryFn: () => fetchJson<AddressSuggestion[]>(`/api/geocode?q=${encodeURIComponent(query)}`),
    enabled: query.trim().length >= 3,
    staleTime: 5 * 60 * 1000,
  });
}

export function useMe() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["me", token],
    queryFn: () => authedFetchJson<User>("/api/me", token!),
    enabled: !!token,
  });
}

export function useUpdateProfile() {
  const { token, setUser } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (updates: { name?: string; homeAddress?: string | null }) =>
      authedFetchJson<User>("/api/me", token!, { method: "PUT", body: JSON.stringify(updates) }),
    onSuccess: (user) => {
      setUser(user);
      queryClient.setQueryData(["me", token], user);
      showToast("Profile updated", "success");
    },
    onError: () => showToast("Couldn't save your profile — try again", "error"),
  });
}

export function useTrips() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["trips", token],
    queryFn: () => authedFetchJson<Trip[]>("/api/trips", token!),
    enabled: !!token,
  });
}

export function useTrip(id: string | undefined): Trip | undefined {
  const { data } = useTrips();
  return data?.find((t) => t.id === id);
}

function useInvalidateTrips() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: ["trips", token] });
}

export function useCreateTrip() {
  const { token } = useAuth();
  const invalidate = useInvalidateTrips();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (name?: string) =>
      authedFetchJson<Trip>("/api/trips", token!, { method: "POST", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      invalidate();
      showToast("Trip created", "success");
    },
    onError: () => showToast("Couldn't create the trip — try again", "error"),
  });
}

export function useRenameTrip() {
  const { token } = useAuth();
  const invalidate = useInvalidateTrips();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ tripId, name }: { tripId: string; name: string }) =>
      authedFetchJson<Trip>(`/api/trips/${tripId}`, token!, { method: "PATCH", body: JSON.stringify({ name }) }),
    onSuccess: () => {
      invalidate();
      showToast("Trip renamed", "success");
    },
    onError: () => showToast("Couldn't rename the trip — try again", "error"),
  });
}

export function useDeleteTrip() {
  const { token } = useAuth();
  const invalidate = useInvalidateTrips();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (tripId: string) => authedFetchJson<void>(`/api/trips/${tripId}`, token!, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      showToast("Trip deleted", "success");
    },
    onError: () => showToast("Couldn't delete the trip — try again", "error"),
  });
}

export function useAddEventToTrip() {
  const { token } = useAuth();
  const invalidate = useInvalidateTrips();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ tripId, eventId }: { tripId: string; eventId: string }) =>
      authedFetchJson(`/api/trips/${tripId}/events`, token!, {
        method: "POST",
        body: JSON.stringify({ eventId }),
      }),
    onSuccess: () => {
      invalidate();
      showToast("Added to trip", "success");
    },
    onError: () => showToast("Couldn't add that event — try again", "error"),
  });
}

export function useNotificationPreferences() {
  const { token } = useAuth();
  return useQuery({
    queryKey: ["notification-preferences", token],
    queryFn: () => authedFetchJson<{ eventTypes: EventType[] }>("/api/me/notification-preferences", token!),
    enabled: !!token,
  });
}

export function useUpdateNotificationPreferences() {
  const { token } = useAuth();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: (eventTypes: EventType[]) =>
      authedFetchJson<{ eventTypes: EventType[] }>("/api/me/notification-preferences", token!, {
        method: "PUT",
        body: JSON.stringify({ eventTypes }),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(["notification-preferences", token], data);
      showToast("Notification preferences saved", "success");
    },
    onError: () => showToast("Couldn't save notification preferences — try again", "error"),
  });
}

export function useRegisterPushToken() {
  const { token } = useAuth();
  return useMutation({
    mutationFn: (pushToken: string) =>
      authedFetchJson<void>("/api/me/push-token", token!, {
        method: "POST",
        body: JSON.stringify({ token: pushToken }),
      }),
  });
}

export function useRemoveEventFromTrip() {
  const { token } = useAuth();
  const invalidate = useInvalidateTrips();
  const { showToast } = useToast();
  return useMutation({
    mutationFn: ({ tripId, eventId }: { tripId: string; eventId: string }) =>
      authedFetchJson<void>(`/api/trips/${tripId}/events/${eventId}`, token!, { method: "DELETE" }),
    onSuccess: () => {
      invalidate();
      showToast("Removed from trip", "info");
    },
    onError: () => showToast("Couldn't remove that event — try again", "error"),
  });
}
