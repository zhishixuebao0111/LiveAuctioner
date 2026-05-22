import client from './client';
import type { Product, ProductStatus } from '@liveauctioner/shared';

export interface ProductListQuery {
  page?: number;
  limit?: number;
  category?: string;
  keyword?: string;
}

export interface MyProductListQuery extends ProductListQuery {
  status?: ProductStatus;
}

export interface CreateProductDto {
  name: string;
  description?: string;
  images: string[];
  category: string;
}

export type UpdateProductDto = Partial<CreateProductDto>;

export interface ReviewProductDto {
  status: 'APPROVED' | 'REJECTED';
  reviewNote?: string;
}

export interface ProductListResponse {
  data: {
    products: Product[];
    pagination: {
      page: number;
      limit: number;
      total: number;
    };
  };
}

export interface ProductDetail extends Product {
  reviewNote?: string | null;
  reviewedAt?: string | null;
  reviewedBy?: string | null;
  seller?: {
    id: string;
    username: string;
  };
  _count?: {
    auctions: number;
  };
}

export interface ProductDetailResponse {
  data: ProductDetail;
}

const buildQuery = (query: ProductListQuery | MyProductListQuery) => {
  const params = new URLSearchParams();

  Object.entries(query).forEach(([key, value]) => {
    if (value !== undefined && value !== '') {
      params.set(key, String(value));
    }
  });

  return params.toString();
};

export const productApi = {
  getProducts: (query: ProductListQuery = {}) =>
    client.get<ProductListResponse>(`/products${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  searchProducts: (query: ProductListQuery = {}) =>
    client.get<ProductListResponse>(`/search/products${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  getMyProducts: (query: MyProductListQuery = {}) =>
    client.get<ProductListResponse>(`/products/my${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  getAdminProducts: (query: MyProductListQuery = {}) =>
    client.get<ProductListResponse>(`/admin/products${buildQuery(query) ? `?${buildQuery(query)}` : ''}`),

  getMyProductById: (id: string) => client.get<ProductDetailResponse>(`/products/my/${id}`),

  getProductById: (id: string) => client.get<ProductDetailResponse>(`/products/${id}`),

  createProduct: (dto: CreateProductDto) => client.post<ProductDetailResponse>('/products', dto),

  updateProduct: (id: string, dto: UpdateProductDto) =>
    client.patch<ProductDetailResponse>(`/products/${id}`, dto),

  uploadImages: (files: File[]) => {
    const formData = new FormData();
    files.forEach((file) => formData.append('images', file));
    return client.post<{ data: { images: string[] } }>('/products/images/upload', formData);
  },

  deleteProduct: (id: string) => client.delete(`/products/${id}`),

  submitReview: (id: string) => client.patch<ProductDetailResponse>(`/products/${id}/submit-review`),

  reviewProduct: (id: string, dto: ReviewProductDto) =>
    client.patch<ProductDetailResponse>(`/products/${id}/review`, dto),

  addImages: (id: string, images: string[]) =>
    client.post<ProductDetailResponse>(`/products/${id}/images`, { images }),

  removeImage: (id: string, imageId: string) =>
    client.delete<ProductDetailResponse>(`/products/${id}/images/${encodeURIComponent(imageId)}`),

  getCategories: () => client.get<{ data: string[] }>('/products/categories'),
};
