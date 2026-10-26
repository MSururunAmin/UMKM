import { describe, expect, it } from "vitest";
import { createMerchantProductFormData } from "./merchant-product-form";

describe("createMerchantProductFormData", () => {
  it("includes the product fields and image using the API field names", () => {
    const image = new File(["image"], "product.png", { type: "image/png" });
    const formData = createMerchantProductFormData({
      name: "Keripik",
      category_id: "4",
      price: "1000",
      stock: "3",
      description: "Camilan lokal",
      image,
    });

    expect([...formData.keys()]).toEqual(["name", "category_id", "price", "stock", "description", "image"]);
    expect(formData.get("image")).toBe(image);
  });

  it("adds Laravel method spoofing when editing", () => {
    const formData = createMerchantProductFormData({
      name: "Keripik",
      category_id: "4",
      price: "1000",
      stock: "3",
      description: "Camilan lokal",
      image: null,
    }, true);

    expect(formData.get("_method")).toBe("PUT");
    expect(formData.has("image")).toBe(false);
  });
});
