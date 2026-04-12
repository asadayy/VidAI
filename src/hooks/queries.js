import { useQuery } from '@tanstack/react-query';
import { bookingAPI } from '../api/bookings';
import { budgetAPI } from '../api/budget';
import { vendorAPI } from '../api/vendors';
import { chatAPI } from '../api';
import { eventAPI } from '../api';

// ── Keys ────────────────────────────────────────────────
export const queryKeys = {
  dashboardBookings: ['bookings', 'dashboard'],
  upcomingCount: ['events', 'upcomingCount'],
  bookings: (params) => ['bookings', params],
  budgetSummary: ['budget', 'summary'],
  budget: ['budget'],
  events: ['events'],
  vendors: (params) => ['vendors', params],
  conversations: ['conversations'],
};

// ── Dashboard ───────────────────────────────────────────
export function useDashboardBookings() {
  return useQuery({
    queryKey: queryKeys.dashboardBookings,
    queryFn: async () => {
      const res = await bookingAPI.getMyBookings({ limit: 4 });
      return res.data.data.bookings || [];
    },
  });
}

export function useUpcomingCount() {
  return useQuery({
    queryKey: queryKeys.upcomingCount,
    queryFn: async () => {
      const res = await eventAPI.getUpcomingCount();
      return res.data.data.count;
    },
  });
}

export function useBudgetSummary() {
  return useQuery({
    queryKey: queryKeys.budgetSummary,
    queryFn: async () => {
      const res = await budgetAPI.getSummary();
      return res.data?.data?.summary || null;
    },
  });
}

// ── Bookings ────────────────────────────────────────────
export function useMyBookings() {
  return useQuery({
    queryKey: queryKeys.bookings({}),
    queryFn: async () => {
      const res = await bookingAPI.getMyBookings();
      return res.data.data.bookings || [];
    },
  });
}

// ── Budget ──────────────────────────────────────────────
export function useBudget() {
  return useQuery({
    queryKey: queryKeys.budget,
    queryFn: async () => {
      const res = await budgetAPI.getMine();
      return res.data?.data?.budget || res.data?.budget || null;
    },
  });
}

// ── Events ──────────────────────────────────────────────
export function useEvents() {
  return useQuery({
    queryKey: queryKeys.events,
    queryFn: async () => {
      const res = await eventAPI.getAll();
      return res.data?.data?.events || [];
    },
  });
}

// ── Vendors ─────────────────────────────────────────────
export function useVendors(params, options = {}) {
  return useQuery({
    queryKey: queryKeys.vendors(params),
    queryFn: async () => {
      const res = params?.search
        ? await vendorAPI.search({ q: params.search, ...params })
        : await vendorAPI.getAll(params);
      const vendors = res.data?.data?.vendors || res.data?.vendors || [];
      const pagination = res.data?.data?.pagination || { page: 1, pages: 1, total: vendors.length };
      return { vendors, pagination };
    },
    ...options,
  });
}

// ── Conversations ───────────────────────────────────────
export function useConversations() {
  return useQuery({
    queryKey: queryKeys.conversations,
    queryFn: async () => {
      const res = await chatAPI.getConversations();
      return res.data.data;
    },
    staleTime: 30 * 1000, // 30s — messages change frequently
  });
}
