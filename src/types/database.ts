export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type BookingStatus =
  | "booked"
  | "rescheduled"
  | "cancelled"
  | "attended"
  | "no_show";

export type BookingEventType =
  | "created"
  | "rescheduled"
  | "cancelled"
  | "attended"
  | "no_show"
  | "notes_added"
  | "reminder_sent";

export type PackageStatus = "active" | "completed" | "expired";

export type TrainerTier = "free" | "paid";

export type NudgeType = "inactive_client" | "package_expiring";

// Row types used throughout the app
export interface Trainer {
  id: string;
  supabase_auth_id: string;
  email: string;
  full_name: string;
  slug: string;
  timezone: string;
  buffer_minutes: number;
  google_calendar_id: string | null;
  google_refresh_token: string | null;
  google_sync_token: string | null;
  avatar_url: string | null;
  tier: TrainerTier;
  bio: string | null;
  city: string | null;
  specialties: string[] | null;
  brand_primary_color: string;
  brand_hide_logo: boolean;
  referral_code: string;
  referred_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Rating {
  id: string;
  booking_id: string;
  trainer_id: string;
  client_id: string;
  score: number;
  comment: string | null;
  token: string;
  created_at: string;
}

export interface ReferralCredit {
  id: string;
  referrer_id: string;
  referred_id: string;
  booking_id: string | null;
  status: "pending" | "credited" | "expired";
  created_at: string;
}

export interface Nudge {
  id: string;
  trainer_id: string;
  client_id: string;
  type: NudgeType;
  dismissed: boolean;
  created_at: string;
}

export interface Client {
  id: string;
  trainer_id: string;
  email: string;
  full_name: string;
  phone: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface Package {
  id: string;
  trainer_id: string;
  client_id: string;
  name: string;
  total_sessions: number;
  used_sessions: number;
  status: PackageStatus;
  created_at: string;
  updated_at: string;
}

export interface AvailabilityRule {
  id: string;
  trainer_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_active: boolean;
  created_at: string;
}

export interface Booking {
  id: string;
  trainer_id: string;
  client_id: string;
  package_id: string | null;
  status: BookingStatus;
  starts_at: string;
  ends_at: string;
  google_event_id: string | null;
  session_notes: string | null;
  reminder_sent: boolean;
  created_at: string;
  updated_at: string;
}

export interface BookingEvent {
  id: string;
  booking_id: string;
  trainer_id: string;
  client_id: string;
  event_type: BookingEventType;
  old_starts_at: string | null;
  new_starts_at: string | null;
  metadata: Json;
  created_at: string;
}

// Supabase Database type — minimal definition for client typing.
// Will be replaced with `supabase gen types typescript` once connected.
export interface Database {
  public: {
    Tables: {
      trainers: {
        Row: Trainer;
        Insert: Partial<Trainer> & Pick<Trainer, "supabase_auth_id" | "email" | "full_name" | "slug">;
        Update: Partial<Trainer>;
        Relationships: [];
      };
      clients: {
        Row: Client;
        Insert: Partial<Client> & Pick<Client, "trainer_id" | "email" | "full_name">;
        Update: Partial<Client>;
        Relationships: [];
      };
      packages: {
        Row: Package;
        Insert: Partial<Package> & Pick<Package, "trainer_id" | "client_id" | "name" | "total_sessions">;
        Update: Partial<Package>;
        Relationships: [];
      };
      availability_rules: {
        Row: AvailabilityRule;
        Insert: Partial<AvailabilityRule> & Pick<AvailabilityRule, "trainer_id" | "day_of_week" | "start_time" | "end_time">;
        Update: Partial<AvailabilityRule>;
        Relationships: [];
      };
      bookings: {
        Row: Booking;
        Insert: Partial<Booking> & Pick<Booking, "trainer_id" | "client_id" | "starts_at" | "ends_at">;
        Update: Partial<Booking>;
        Relationships: [];
      };
      booking_events: {
        Row: BookingEvent;
        Insert: Partial<BookingEvent> & Pick<BookingEvent, "booking_id" | "trainer_id" | "client_id" | "event_type">;
        Update: Partial<BookingEvent>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: {
      booking_status: BookingStatus;
      booking_event_type: BookingEventType;
      package_status: PackageStatus;
    };
  };
}
