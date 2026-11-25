import type { Category } from "@/types/api";

export type CategoryForm = {
  name: string;
  caption: string;
  emoji: string;
  image_url: string;
  is_active: boolean;
};

export type BannerForm = {
  title: string;
  description: string;
  image_url: string;
  link_url: string;
  is_active: boolean;
  sort_order: string;
};

export const emptyCategory: CategoryForm = {
  name: "",
  caption: "",
  emoji: "🍽️",
  image_url: "",
  is_active: true,
};

export const emptyBanner: BannerForm = {
  title: "",
  description: "",
  image_url: "",
  link_url: "",
  is_active: true,
  sort_order: "0",
};

export function categoryToForm(category: Category): CategoryForm {
  return {
    name: category.name,
    caption: category.caption ?? "",
    emoji: category.emoji ?? "🍽️",
    image_url: category.image_url ?? "",
    is_active: category.is_active ?? true,
  };
}

export function bannerToForm(banner: {
  title: string;
  description: string | null;
  image_url: string | null;
  link_url: string | null;
  is_active: boolean;
  sort_order: number;
}): BannerForm {
  return {
    title: banner.title,
    description: banner.description ?? "",
    image_url: banner.image_url ?? "",
    link_url: banner.link_url ?? "",
    is_active: banner.is_active,
    sort_order: String(banner.sort_order),
  };
}
