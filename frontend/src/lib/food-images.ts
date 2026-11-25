import type { Category } from "@/types/api";

const foodPhoto = (id: string, width: number) =>
  `https://images.unsplash.com/${id}?auto=format&fit=crop&w=${width}&q=80`;

export const featuredFoodImage = foodPhoto("photo-1569718212165-3a8278d5f624", 1200);

const categoryPhotos: Record<string, string> = {
  "makanan-berat": foodPhoto("photo-1546069901-ba9599a7e63c", 640),
  "jajanan-pasar": foodPhoto("photo-1488477181946-6428a0291777", 640),
  minuman: foodPhoto("photo-1544145945-f90425340c7e", 640),
  camilan: foodPhoto("photo-1573080496219-bb080dd4f877", 640),
};

export function getFoodImage(category?: Pick<Category, "slug" | "name" | "image_url"> | null): string {
  if (category?.image_url) return category.image_url;

  const identifier = `${category?.slug ?? ""} ${category?.name ?? ""}`.toLowerCase();
  const match = Object.keys(categoryPhotos).find((slug) => identifier.includes(slug));
  return categoryPhotos[match ?? "makanan-berat"];
}
