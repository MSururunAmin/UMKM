import { describe, expect, it } from "vitest";
import { featuredFoodImage, getFoodImage } from "./food-images";

describe("food image fallbacks", () => {
  it("uses a real featured food photo", () => {
    expect(featuredFoodImage).toContain("images.unsplash.com/photo-");
  });

  it("prefers an uploaded category photo", () => {
    expect(getFoodImage({ name: "Minuman", slug: "minuman", image_url: "/drink.jpg" })).toBe("/drink.jpg");
  });

  it("chooses a matching photo for a known category", () => {
    expect(getFoodImage({ name: "Camilan", slug: "camilan" })).toContain("photo-1573080496219-bb080dd4f877");
  });

  it("falls back to a real food photo for an unknown category", () => {
    expect(getFoodImage({ name: "Lainnya", slug: "lainnya" })).toContain("images.unsplash.com/photo-");
  });
});
