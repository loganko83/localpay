/**
 * Public Delivery Service
 *
 * Zero/low-commission delivery platform using blockchain for:
 * - Order management on distributed ledger
 * - Split payment via smart contract (merchant + rider)
 * - Real-time settlement (D+0)
 * - Rider work history as verifiable credential
 *
 * Based on: Dongbaek Tong (부산), Daeguro (대구로) public delivery apps
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Orders, riders, settlements (in-memory)
 * - [REAL] Fee calculation formulas (based on actual public delivery rates)
 * - [INTEGRATION READY] Actual delivery platform APIs
 */

import { auditLogService } from './auditLog';
import { blockchainAnchoringService } from './blockchainAnchoring';

// ============================================
// [REAL] Fee structure based on public delivery apps
// Dongbaek Tong: 0% commission, ~3000 KRW delivery fee
// ============================================
const FEE_CONFIG = {
  platformCommission: 0,           // [REAL] 0% platform commission
  pgFee: 0.01,                     // [REAL] 1% payment gateway fee (unavoidable)
  baseDeliveryFee: 3000,           // [REAL] Base delivery fee
  distanceFeePerKm: 500,           // Additional per km
  nightSurcharge: 1000,            // 22:00 - 06:00
  rainSurcharge: 500,              // Bad weather
  riderMinimumGuarantee: 4000,     // Minimum rider earnings per delivery
};

// Order status
type OrderStatus =
  | 'PLACED'           // Order received
  | 'ACCEPTED'         // Restaurant accepted
  | 'PREPARING'        // Food being prepared
  | 'READY'            // Ready for pickup
  | 'PICKED_UP'        // Rider picked up
  | 'DELIVERING'       // On the way
  | 'DELIVERED'        // Completed
  | 'CANCELLED';       // Cancelled

// Delivery order
interface DeliveryOrder {
  id: string;
  customerId: string;
  merchantId: string;
  riderId?: string;
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: number;
    options?: string[];
  }>;
  subtotal: number;
  deliveryFee: number;
  platformFee: number;            // Should be 0 for public delivery
  total: number;
  status: OrderStatus;
  createdAt: number;
  acceptedAt?: number;
  pickedUpAt?: number;
  deliveredAt?: number;
  deliveryAddress: string;
  deliveryDistance: number;       // km
  estimatedDeliveryTime: number;  // minutes
  specialInstructions?: string;
  settlement?: SettlementRecord;
}

// Settlement record (blockchain anchored)
interface SettlementRecord {
  id: string;
  orderId: string;
  merchantAmount: number;
  riderAmount: number;
  platformAmount: number;
  pgFeeAmount: number;
  settledAt: number;
  blockchainTxHash?: string;
  status: 'PENDING' | 'COMPLETED' | 'FAILED';
}

// Rider profile
interface RiderProfile {
  id: string;
  name: string;
  phone: string;
  vehicleType: 'BIKE' | 'MOTORCYCLE' | 'CAR';
  isActive: boolean;
  rating: number;
  totalDeliveries: number;
  totalEarnings: number;
  registeredAt: number;
  workHistory: WorkHistoryEntry[];
}

// Work history entry (for verifiable credential)
interface WorkHistoryEntry {
  date: string;
  orderId: string;
  earnings: number;
  distance: number;
  duration: number;  // minutes
  rating?: number;
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const orderStore = new Map<string, DeliveryOrder>();
const riderStore = new Map<string, RiderProfile>();
const merchantOrderQueue = new Map<string, string[]>(); // merchantId -> orderIds

// Generate IDs
const generateOrderId = (): string => `ORD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;
const generateSettlementId = (): string => `STL-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

class PublicDeliveryService {
  /**
   * [REAL FORMULA] Calculate delivery fee
   */
  calculateDeliveryFee(params: {
    distance: number;
    isNightTime?: boolean;
    isBadWeather?: boolean;
  }): {
    baseFee: number;
    distanceFee: number;
    surcharges: number;
    total: number;
  } {
    const baseFee = FEE_CONFIG.baseDeliveryFee;
    const distanceFee = Math.max(0, (params.distance - 2) * FEE_CONFIG.distanceFeePerKm); // Free for first 2km
    let surcharges = 0;

    if (params.isNightTime) {
      surcharges += FEE_CONFIG.nightSurcharge;
    }
    if (params.isBadWeather) {
      surcharges += FEE_CONFIG.rainSurcharge;
    }

    return {
      baseFee,
      distanceFee: Math.floor(distanceFee),
      surcharges,
      total: Math.floor(baseFee + distanceFee + surcharges),
    };
  }

  /**
   * [MOCK] Place delivery order
   */
  async placeOrder(params: {
    customerId: string;
    merchantId: string;
    items: DeliveryOrder['items'];
    deliveryAddress: string;
    deliveryDistance: number;
    specialInstructions?: string;
  }): Promise<DeliveryOrder> {
    const subtotal = params.items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
    const deliveryFeeCalc = this.calculateDeliveryFee({ distance: params.deliveryDistance });
    // PG fee calculated for settlement purposes (not charged to customer)
    const pgFee = Math.floor(subtotal * FEE_CONFIG.pgFee);
    console.debug('[PublicDelivery] PG fee for settlement:', pgFee);

    const order: DeliveryOrder = {
      id: generateOrderId(),
      customerId: params.customerId,
      merchantId: params.merchantId,
      items: params.items,
      subtotal,
      deliveryFee: deliveryFeeCalc.total,
      platformFee: 0, // Zero commission!
      total: subtotal + deliveryFeeCalc.total,
      status: 'PLACED',
      createdAt: Date.now(),
      deliveryAddress: params.deliveryAddress,
      deliveryDistance: params.deliveryDistance,
      estimatedDeliveryTime: Math.ceil(20 + params.deliveryDistance * 5), // Base 20min + 5min/km
      specialInstructions: params.specialInstructions,
    };

    orderStore.set(order.id, order);

    // Add to merchant queue
    const queue = merchantOrderQueue.get(params.merchantId) || [];
    queue.push(order.id);
    merchantOrderQueue.set(params.merchantId, queue);

    // Audit log
    await auditLogService.log({
      action: 'PAYMENT_REQUESTED',
      actorId: params.customerId,
      actorType: 'consumer',
      targetType: 'delivery_order',
      targetId: order.id,
      metadata: {
        merchantId: params.merchantId,
        subtotal,
        deliveryFee: deliveryFeeCalc.total,
        total: order.total,
      },
    });

    return order;
  }

  /**
   * [MOCK] Merchant accepts order
   */
  async acceptOrder(orderId: string, estimatedPrepTime: number): Promise<DeliveryOrder | null> {
    const order = orderStore.get(orderId);
    if (!order || order.status !== 'PLACED') return null;

    order.status = 'ACCEPTED';
    order.acceptedAt = Date.now();
    order.estimatedDeliveryTime = estimatedPrepTime + Math.ceil(order.deliveryDistance * 5);

    orderStore.set(orderId, order);
    return order;
  }

  /**
   * [MOCK] Assign rider to order
   */
  async assignRider(orderId: string, riderId: string): Promise<DeliveryOrder | null> {
    const order = orderStore.get(orderId);
    const rider = riderStore.get(riderId);
    if (!order || !rider || order.status !== 'READY') return null;

    order.riderId = riderId;
    order.status = 'PICKED_UP';
    order.pickedUpAt = Date.now();

    orderStore.set(orderId, order);
    return order;
  }

  /**
   * [MOCK + BLOCKCHAIN] Complete delivery and settle payments
   * This is the key feature: instant split settlement
   */
  async completeDelivery(orderId: string): Promise<SettlementRecord | null> {
    const order = orderStore.get(orderId);
    if (!order || order.status !== 'PICKED_UP' || !order.riderId) return null;

    const rider = riderStore.get(order.riderId);
    if (!rider) return null;

    // Mark as delivered
    order.status = 'DELIVERED';
    order.deliveredAt = Date.now();

    // [REAL FORMULA] Calculate settlement split
    const pgFee = Math.floor(order.subtotal * FEE_CONFIG.pgFee);
    const merchantAmount = order.subtotal - pgFee;  // Merchant gets full subtotal minus PG fee
    const riderAmount = Math.max(order.deliveryFee, FEE_CONFIG.riderMinimumGuarantee);
    const platformAmount = 0; // Zero commission

    const settlement: SettlementRecord = {
      id: generateSettlementId(),
      orderId,
      merchantAmount,
      riderAmount,
      platformAmount,
      pgFeeAmount: pgFee,
      settledAt: Date.now(),
      status: 'PENDING',
    };

    // Anchor settlement to blockchain
    const anchorResult = await blockchainAnchoringService.addTransaction(
      settlement.id,
      'settlement',
      {
        orderId,
        merchantAmount,
        riderAmount,
        total: merchantAmount + riderAmount,
      }
    );
    settlement.blockchainTxHash = anchorResult.hash;
    settlement.status = 'COMPLETED';

    order.settlement = settlement;
    orderStore.set(orderId, order);

    // Update rider stats
    rider.totalDeliveries++;
    rider.totalEarnings += riderAmount;
    rider.workHistory.push({
      date: new Date().toISOString().split('T')[0],
      orderId,
      earnings: riderAmount,
      distance: order.deliveryDistance,
      duration: order.deliveredAt && order.pickedUpAt
        ? Math.floor((order.deliveredAt - order.pickedUpAt) / 60000)
        : 0,
    });
    riderStore.set(rider.id, rider);

    // Audit log
    await auditLogService.log({
      action: 'SETTLEMENT_VERIFIED',
      actorId: 'system',
      actorType: 'system',
      targetType: 'delivery_settlement',
      targetId: settlement.id,
      metadata: {
        orderId,
        merchantId: order.merchantId,
        riderId: order.riderId,
        merchantAmount,
        riderAmount,
        blockchainTxHash: settlement.blockchainTxHash,
      },
    });

    return settlement;
  }

  /**
   * [MOCK] Register rider
   */
  registerRider(params: {
    id: string;
    name: string;
    phone: string;
    vehicleType: RiderProfile['vehicleType'];
  }): RiderProfile {
    const rider: RiderProfile = {
      ...params,
      isActive: true,
      rating: 5.0,
      totalDeliveries: 0,
      totalEarnings: 0,
      registeredAt: Date.now(),
      workHistory: [],
    };

    riderStore.set(params.id, rider);
    return rider;
  }

  /**
   * Get rider work history (for verifiable credential)
   */
  getRiderWorkHistory(riderId: string): {
    profile: RiderProfile | null;
    summary: {
      totalDeliveries: number;
      totalEarnings: number;
      totalDistance: number;
      averageRating: number;
      workDays: number;
    };
    recentHistory: WorkHistoryEntry[];
  } {
    const rider = riderStore.get(riderId);
    if (!rider) {
      return {
        profile: null,
        summary: { totalDeliveries: 0, totalEarnings: 0, totalDistance: 0, averageRating: 0, workDays: 0 },
        recentHistory: [],
      };
    }

    const totalDistance = rider.workHistory.reduce((sum, w) => sum + w.distance, 0);
    const uniqueDays = new Set(rider.workHistory.map(w => w.date)).size;
    const ratings = rider.workHistory.filter(w => w.rating).map(w => w.rating!);
    const avgRating = ratings.length > 0 ? ratings.reduce((a, b) => a + b, 0) / ratings.length : 5.0;

    return {
      profile: rider,
      summary: {
        totalDeliveries: rider.totalDeliveries,
        totalEarnings: rider.totalEarnings,
        totalDistance: Math.round(totalDistance * 10) / 10,
        averageRating: Math.round(avgRating * 10) / 10,
        workDays: uniqueDays,
      },
      recentHistory: rider.workHistory.slice(-30), // Last 30 deliveries
    };
  }

  /**
   * Get order details
   */
  getOrder(orderId: string): DeliveryOrder | null {
    return orderStore.get(orderId) || null;
  }

  /**
   * Get merchant's pending orders
   */
  getMerchantOrders(merchantId: string): DeliveryOrder[] {
    const orderIds = merchantOrderQueue.get(merchantId) || [];
    return orderIds
      .map(id => orderStore.get(id))
      .filter((o): o is DeliveryOrder => o !== undefined)
      .filter(o => o.status !== 'DELIVERED' && o.status !== 'CANCELLED');
  }

  /**
   * Get fee configuration (for transparency display)
   */
  getFeeConfig(): typeof FEE_CONFIG {
    return { ...FEE_CONFIG };
  }

  /**
   * Compare with private platform fees
   * Shows savings from using public delivery
   */
  compareFees(orderAmount: number): {
    publicDelivery: { commission: number; total: number };
    privateDelivery: { commission: number; total: number };
    savings: number;
  } {
    // Private platforms typically charge 10-15% commission
    const privateCommissionRate = 0.12; // 12% average

    const publicCommission = 0;
    const privateCommission = Math.floor(orderAmount * privateCommissionRate);

    return {
      publicDelivery: {
        commission: publicCommission,
        total: orderAmount + publicCommission,
      },
      privateDelivery: {
        commission: privateCommission,
        total: orderAmount + privateCommission,
      },
      savings: privateCommission - publicCommission,
    };
  }
}

// Export singleton
export const publicDeliveryService = new PublicDeliveryService();

// Export types
export type {
  DeliveryOrder,
  SettlementRecord,
  RiderProfile,
  WorkHistoryEntry,
  OrderStatus,
};
