export type MerchantProductFormValues = {
  name: string;
  category_id: string;
  price: string;
  stock: string;
  description: string;
  image: File | null;
};

export function createMerchantProductFormData(values: MerchantProductFormValues, editing = false): FormData {
  const formData = new FormData();
  formData.append("name", values.name);
  formData.append("category_id", values.category_id);
  formData.append("price", values.price);
  formData.append("stock", values.stock);
  formData.append("description", values.description);
  if (values.image) formData.append("image", values.image);
  if (editing) formData.append("_method", "PUT");

  return formData;
}
