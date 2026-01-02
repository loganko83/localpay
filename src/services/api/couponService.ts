/**
 * Coupon and Offer Service
 * Frontend integration for coupons and promotional offers
 */

import { backendApiClient } from './client';

// ==================== Types ====================

export interface Coupon {
  id: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed' | 'cashback';
  discountValue: number;
  minPurchase: number;
  maxDiscount: number | null;
  validFrom: string;
  validUntil: string;
  remainingCount: number | null;
  category: string | null;
  region: string | null;
  imageUrl: string | null;
  merchant: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  } | null;
  claimed: boolean;
  claimStatus: string | null;
}

export interface UserCoupon {
  id: string;
  couponId: string;
  name: string;
  description: string | null;
  discountType: 'percentage' | 'fixed' | 'cashback';
  discountValue: number;
  minPurchase: number;
  maxDiscount: number | null;
  validFrom: string;
  validUntil: string;
  category: string | null;
  region: string | null;
  imageUrl: string | null;
  merchant: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  } | null;
  claimedAt: string;
  usedAt: string | null;
  transactionId: string | null;
  status: 'available' | 'used' | 'expired';
}

export interface CouponDetail extends Coupon {
  usageLimit: number;
  usedCount: number;
  status: string;
  isValid: boolean;
  userCoupon: {
    id: string;
    claimedAt: string;
    usedAt: string | null;
    status: string;
  } | null;
}

export interface Offer {
  id: string;
  title: string;
  description: string | null;
  discountType: 'percentage' | 'fixed' | 'cashback' | null;
  discountValue: number | null;
  minPurchase: number;
  imageUrl: string | null;
  terms: string | null;
  validFrom: string | null;
  validUntil: string | null;
  viewCount: number;
  claimCount: number;
  merchant: {
    id: string;
    name: string | null;
    imageUrl: string | null;
  } | null;
}

export interface CouponFilters {
  category?: string;
  region?: string;
  merchant?: string;
  page?: number;
  limit?: number;
}

export interface CouponListResponse {
  coupons: Coupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface UserCouponListResponse {
  coupons: UserCoupon[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface OfferListResponse {
  offers: Offer[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ClaimCouponResponse {
  userCouponId: string;
  couponId: string;
  couponName: string;
  message: string;
}

export interface UseCouponResponse {
  couponId: string;
  couponName: string;
  discountType: string;
  discountValue: number;
  purchaseAmount: number;
  discount: number;
  finalAmount: number;
  message: string;
}

export interface CouponStats {
  available: number;
  used: number;
  expired: number;
  totalSaved: number;
}

// ==================== Coupon Service ====================

class CouponService {
  /**
   * Get available coupons
   */
  async getCoupons(filters?: CouponFilters): Promise<CouponListResponse> {
    const params = new URLSearchParams();

    if (filters?.category) params.append('category', filters.category);
    if (filters?.region) params.append('region', filters.region);
    if (filters?.merchant) params.append('merchant', filters.merchant);
    if (filters?.page) params.append('page', filters.page.toString());
    if (filters?.limit) params.append('limit', filters.limit.toString());

    const queryString = params.toString();
    const endpoint = queryString ? `/coupons?${queryString}` : '/coupons';

    const response = await backendApiClient.get<{ success: boolean; data: CouponListResponse }>(endpoint);
    return response.data;
  }

  /**
   * Get user's coupons
   */
  async getMyCoupons(status?: 'available' | 'used' | 'expired', page: number = 1, limit: number = 20): Promise<UserCouponListResponse> {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('page', page.toString());
    params.append('limit', limit.toString());

    const response = await backendApiClient.get<{ success: boolean; data: UserCouponListResponse }>(`/coupons/my?${params.toString()}`);
    return response.data;
  }

  /**
   * Get coupon details
   */
  async getCoupon(couponId: string): Promise<CouponDetail> {
    const response = await backendApiClient.get<{ success: boolean; data: CouponDetail }>(`/coupons/${couponId}`);
    return response.data;
  }

  /**
   * Claim a coupon
   */
  async claimCoupon(couponId: string): Promise<ClaimCouponResponse> {
    const response = await backendApiClient.post<{ success: boolean; data: ClaimCouponResponse }>(`/coupons/${couponId}/claim`, {});
    return response.data;
  }

  /**
   * Use a coupon
   */
  async useCoupon(userCouponId: string, purchaseAmount: number, transactionId?: string): Promise<UseCouponResponse> {
    const response = await backendApiClient.post<{ success: boolean; data: UseCouponResponse }>(`/coupons/${userCouponId}/use`, {
      purchaseAmount,
      transactionId,
    });
    return response.data;
  }

  /**
   * Get offers
   */
  async getOffers(page: number = 1, limit: number = 20): Promise<OfferListResponse> {
    const response = await backendApiClient.get<{ success: boolean; data: OfferListResponse }>(`/coupons/offers?page=${page}&limit=${limit}`);
    return response.data;
  }

  /**
   * Get offer details
   */
  async getOffer(offerId: string): Promise<Offer> {
    const response = await backendApiClient.get<{ success: boolean; data: Offer }>(`/coupons/offers/${offerId}`);
    return response.data;
  }

  /**
   * Get user coupon stats
   */
  async getCouponStats(): Promise<CouponStats> {
    try {
      const response = await this.getMyCoupons(undefined, 1, 1000);
      const coupons = response.coupons;

      const available = coupons.filter(c => c.status === 'available').length;
      const used = coupons.filter(c => c.status === 'used').length;
      const expired = coupons.filter(c => c.status === 'expired').length;

      // Calculate total saved (simplified - would need transaction data for accurate amount)
      const totalSaved = used * 5000; // Placeholder estimate

      return { available, used, expired, totalSaved };
    } catch {
      return { available: 0, used: 0, expired: 0, totalSaved: 0 };
    }
  }
}

// Export singleton instance
export const couponService = new CouponService();

export default couponService;
