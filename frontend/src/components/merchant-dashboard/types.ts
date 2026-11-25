export type MerchantOrder = {
  id: number;
  order_number: string;
  status: string;
  total_amount: string;
  shipping_type: "delivery" | "pickup";
  delivery_address: string | null;
  is_test: boolean;
  user: { name: string };
};

export type ProductForm = {
  name: string;
  category_id: string;
  price: string;
  stock: string;
  description: string;
  image: File | null;
};
