export type Role = "customer" | "merchant" | "admin";

export type Merchant = {
  id: number;
  store_name: string;
  slug: string;
  description: string | null;
  address: string;
  province?: string | null;
  regency?: string | null;
  district?: string | null;
  village?: string | null;
  latitude?: number | null;
  longitude?: number | null;
  location_checked_at?: string | null;
  location_check_source?: string | null;
  is_verified: boolean;
  is_open: boolean;
  rejected_at: string | null;
};

export type StoreLocation = Pick<
  Merchant,
  | "id"
  | "store_name"
  | "slug"
  | "description"
  | "address"
  | "province"
  | "regency"
  | "district"
  | "village"
  | "latitude"
  | "longitude"
  | "location_checked_at"
  | "location_check_source"
  | "is_open"
>;

export type User = {
  id: number;
  name: string;
  email: string;
  phone?: string | null;
  role: Role;
  merchant?: Merchant | null;
};

export type Category = {
  id: number;
  name: string;
  slug: string;
  image_url?: string | null;
  emoji?: string;
  caption?: string;
  is_active?: boolean;
};

export type Product = {
  id: number;
  name: string;
  slug: string;
  description: string;
  price: string | number;
  stock: number;
  image_url: string;
  merchant?: {
    id: number;
    store_name: string;
    slug: string;
    description?: string | null;
    address?: string | null;
    province?: string | null;
    regency?: string | null;
    district?: string | null;
    village?: string | null;
    latitude?: number | null;
    longitude?: number | null;
    location_checked_at?: string | null;
    is_open?: boolean;
  };
  category?: Category;
};
