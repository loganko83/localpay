/**
 * Product Traceability Service
 *
 * Farm-to-table tracking using blockchain for local produce.
 * Each product has a complete history from producer to consumer.
 *
 * Based on:
 * - Korea Food Safety Portal (foodsafetykorea.go.kr)
 * - Agricultural Product Quality Management Act
 *
 * DATA SOURCE CLASSIFICATION:
 * - [MOCK] Product records, tracking data (in-memory)
 * - [REAL] Product certification types (Korean standards)
 * - [INTEGRATION READY] IoT sensors, RFID, QR codes, NAQS API
 */

import { auditLogService } from './auditLog';
import { blockchainAnchoringService } from './blockchainAnchoring';

// ============================================
// [REAL] Korean agricultural product certification types
// Based on National Agricultural Products Quality Management Service
// ============================================
const CERTIFICATION_TYPES = {
  GAP: {
    code: 'GAP',
    name: 'Good Agricultural Practices',
    nameKo: '농산물우수관리인증',
    validityYears: 2,
  },
  ORGANIC: {
    code: 'ORGANIC',
    name: 'Organic Certification',
    nameKo: '유기농산물인증',
    validityYears: 1,
  },
  PESTICIDE_FREE: {
    code: 'PESTICIDE_FREE',
    name: 'Pesticide-Free',
    nameKo: '무농약농산물인증',
    validityYears: 1,
  },
  HACCP: {
    code: 'HACCP',
    name: 'Hazard Analysis Critical Control Point',
    nameKo: '식품안전관리인증',
    validityYears: 3,
  },
  GEO_INDICATION: {
    code: 'GEO_INDICATION',
    name: 'Geographical Indication',
    nameKo: '지리적표시',
    validityYears: 10,
  },
};

// Product category
type ProductCategory =
  | 'VEGETABLES'
  | 'FRUITS'
  | 'GRAINS'
  | 'MEAT'
  | 'SEAFOOD'
  | 'DAIRY'
  | 'PROCESSED';

// Tracking event type
type TrackingEventType =
  | 'PRODUCED'       // Farm harvest/production
  | 'PROCESSED'      // Processing/packaging
  | 'STORED'         // Cold storage/warehouse
  | 'TRANSPORTED'    // Logistics
  | 'INSPECTED'      // Quality inspection
  | 'DISTRIBUTED'    // Wholesale distribution
  | 'RETAILED'       // Retail store
  | 'PURCHASED';     // Consumer purchase

// Product record
interface TrackedProduct {
  id: string;
  batchId: string;
  productName: string;
  category: ProductCategory;
  producerId: string;
  producerName: string;
  producerLocation: {
    region: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  harvestDate: number;
  expiryDate: number;
  quantity: number;
  unit: string;
  certifications: Array<{
    type: keyof typeof CERTIFICATION_TYPES;
    certNumber: string;
    issuedAt: number;
    expiresAt: number;
  }>;
  trackingHistory: TrackingEvent[];
  currentHolder: string;
  status: 'IN_TRANSIT' | 'STORED' | 'SOLD' | 'EXPIRED' | 'RECALLED';
  blockchainHash?: string;
}

// Tracking event
interface TrackingEvent {
  id: string;
  timestamp: number;
  eventType: TrackingEventType;
  actorId: string;
  actorName: string;
  location: {
    name: string;
    address: string;
    coordinates?: { lat: number; lng: number };
  };
  temperature?: number;        // For cold chain
  humidity?: number;
  notes?: string;
  verificationMethod: 'QR_SCAN' | 'RFID' | 'MANUAL' | 'IOT_SENSOR';
  signature?: string;          // Actor's digital signature
}

// Consumer view of product history
interface ProductHistoryView {
  productId: string;
  productName: string;
  producer: {
    name: string;
    region: string;
  };
  harvestDate: string;
  daysFromHarvest: number;
  certifications: string[];
  journeySteps: Array<{
    step: number;
    event: string;
    location: string;
    date: string;
    verified: boolean;
  }>;
  qualityScore: number;        // 0-100
  blockchainVerified: boolean;
}

// ============================================
// [MOCK] In-memory storage
// ============================================
const productStore = new Map<string, TrackedProduct>();
const producerStore = new Map<string, {
  id: string;
  name: string;
  region: string;
  certifications: string[];
  registeredAt: number;
}>();

// Generate IDs
const generateProductId = (): string => `PRD-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 8)}`;
const generateEventId = (): string => `EVT-${Date.now().toString(36)}-${Math.random().toString(36).substring(2, 6)}`;

class ProductTraceabilityService {
  /**
   * [MOCK] Register producer
   * Production: Integrate with NAQS (National Agricultural Products Quality Service)
   */
  registerProducer(params: {
    id: string;
    name: string;
    region: string;
    certifications: (keyof typeof CERTIFICATION_TYPES)[];
  }): void {
    producerStore.set(params.id, {
      ...params,
      certifications: params.certifications,
      registeredAt: Date.now(),
    });
  }

  /**
   * [MOCK] Register new product batch
   */
  async registerProduct(params: {
    productName: string;
    category: ProductCategory;
    producerId: string;
    harvestDate: number;
    expiryDate: number;
    quantity: number;
    unit: string;
    certifications: Array<{
      type: keyof typeof CERTIFICATION_TYPES;
      certNumber: string;
      expiresAt: number;
    }>;
    location: {
      region: string;
      address: string;
      coordinates?: { lat: number; lng: number };
    };
  }): Promise<TrackedProduct | null> {
    const producer = producerStore.get(params.producerId);
    if (!producer) {
      console.warn('[ProductTraceability] Producer not registered');
      return null;
    }

    const productId = generateProductId();
    const batchId = `BATCH-${params.producerId.slice(-4)}-${Date.now().toString(36)}`;

    const product: TrackedProduct = {
      id: productId,
      batchId,
      productName: params.productName,
      category: params.category,
      producerId: params.producerId,
      producerName: producer.name,
      producerLocation: params.location,
      harvestDate: params.harvestDate,
      expiryDate: params.expiryDate,
      quantity: params.quantity,
      unit: params.unit,
      certifications: params.certifications.map(cert => ({
        ...cert,
        issuedAt: Date.now(),
      })),
      trackingHistory: [],
      currentHolder: params.producerId,
      status: 'IN_TRANSIT',
    };

    // Add initial production event
    product.trackingHistory.push({
      id: generateEventId(),
      timestamp: params.harvestDate,
      eventType: 'PRODUCED',
      actorId: params.producerId,
      actorName: producer.name,
      location: {
        name: producer.name,
        address: params.location.address,
        coordinates: params.location.coordinates,
      },
      verificationMethod: 'MANUAL',
    });

    // Anchor to blockchain
    const anchorResult = await blockchainAnchoringService.addTransaction(
      productId,
      'product_registration',
      {
        productName: params.productName,
        producerId: params.producerId,
        harvestDate: params.harvestDate,
        certifications: params.certifications.map(c => c.type),
      }
    );
    product.blockchainHash = anchorResult.hash;

    productStore.set(productId, product);

    await auditLogService.log({
      action: 'CREDENTIAL_ISSUED',
      actorId: params.producerId,
      actorType: 'producer',
      targetType: 'product_registration',
      targetId: productId,
      metadata: {
        productName: params.productName,
        batchId,
        category: params.category,
      },
    });

    return product;
  }

  /**
   * [MOCK] Add tracking event
   */
  async addTrackingEvent(params: {
    productId: string;
    eventType: TrackingEventType;
    actorId: string;
    actorName: string;
    location: {
      name: string;
      address: string;
      coordinates?: { lat: number; lng: number };
    };
    temperature?: number;
    humidity?: number;
    notes?: string;
    verificationMethod: TrackingEvent['verificationMethod'];
  }): Promise<TrackingEvent | null> {
    const product = productStore.get(params.productId);
    if (!product) return null;

    const event: TrackingEvent = {
      id: generateEventId(),
      timestamp: Date.now(),
      eventType: params.eventType,
      actorId: params.actorId,
      actorName: params.actorName,
      location: params.location,
      temperature: params.temperature,
      humidity: params.humidity,
      notes: params.notes,
      verificationMethod: params.verificationMethod,
    };

    product.trackingHistory.push(event);
    product.currentHolder = params.actorId;

    // Update status based on event
    if (params.eventType === 'STORED') {
      product.status = 'STORED';
    } else if (params.eventType === 'PURCHASED') {
      product.status = 'SOLD';
    } else {
      product.status = 'IN_TRANSIT';
    }

    // Anchor event to blockchain
    await blockchainAnchoringService.addTransaction(
      event.id,
      'tracking_event',
      {
        productId: params.productId,
        eventType: params.eventType,
        location: params.location.name,
      }
    );

    productStore.set(params.productId, product);
    return event;
  }

  /**
   * Get consumer-friendly product history
   */
  getProductHistory(productId: string): ProductHistoryView | null {
    const product = productStore.get(productId);
    if (!product) return null;

    const eventNames: Record<TrackingEventType, string> = {
      PRODUCED: 'Harvested/Produced',
      PROCESSED: 'Processed & Packaged',
      STORED: 'Cold Storage',
      TRANSPORTED: 'In Transit',
      INSPECTED: 'Quality Inspection',
      DISTRIBUTED: 'Wholesale Distribution',
      RETAILED: 'Arrived at Store',
      PURCHASED: 'Purchased',
    };

    const journeySteps = product.trackingHistory.map((event, index) => ({
      step: index + 1,
      event: eventNames[event.eventType],
      location: event.location.name,
      date: new Date(event.timestamp).toLocaleDateString('ko-KR'),
      verified: event.verificationMethod !== 'MANUAL',
    }));

    // Calculate quality score based on various factors
    const qualityScore = this.calculateQualityScore(product);

    return {
      productId,
      productName: product.productName,
      producer: {
        name: product.producerName,
        region: product.producerLocation.region,
      },
      harvestDate: new Date(product.harvestDate).toLocaleDateString('ko-KR'),
      daysFromHarvest: Math.floor((Date.now() - product.harvestDate) / (24 * 60 * 60 * 1000)),
      certifications: product.certifications.map(c => CERTIFICATION_TYPES[c.type].nameKo),
      journeySteps,
      qualityScore,
      blockchainVerified: !!product.blockchainHash,
    };
  }

  /**
   * Calculate quality score based on tracking data
   */
  private calculateQualityScore(product: TrackedProduct): number {
    let score = 70; // Base score

    // Certification bonus (up to +15)
    score += Math.min(product.certifications.length * 5, 15);

    // Cold chain compliance (up to +10)
    const coldChainEvents = product.trackingHistory.filter(e => e.temperature !== undefined);
    if (coldChainEvents.length > 0) {
      const allInRange = coldChainEvents.every(e =>
        e.temperature! >= -5 && e.temperature! <= 10
      );
      if (allInRange) score += 10;
    }

    // Verification method bonus (up to +5)
    const automatedEvents = product.trackingHistory.filter(
      e => e.verificationMethod !== 'MANUAL'
    );
    if (automatedEvents.length > product.trackingHistory.length / 2) {
      score += 5;
    }

    // Freshness penalty
    const daysOld = (Date.now() - product.harvestDate) / (24 * 60 * 60 * 1000);
    if (daysOld > 7) score -= 5;
    if (daysOld > 14) score -= 10;

    return Math.max(0, Math.min(100, score));
  }

  /**
   * Scan QR code to get product info
   */
  scanProductQR(qrData: string): ProductHistoryView | null {
    // QR format: "LOCALPAY:PRD:productId"
    const parts = qrData.split(':');
    if (parts[0] !== 'LOCALPAY' || parts[1] !== 'PRD') return null;
    return this.getProductHistory(parts[2]);
  }

  /**
   * Get products by producer
   */
  getProducerProducts(producerId: string): TrackedProduct[] {
    return Array.from(productStore.values())
      .filter(p => p.producerId === producerId);
  }

  /**
   * Get certification info
   */
  getCertificationTypes(): typeof CERTIFICATION_TYPES {
    return { ...CERTIFICATION_TYPES };
  }

  /**
   * Check product freshness/expiry
   */
  checkFreshness(productId: string): {
    isFresh: boolean;
    daysUntilExpiry: number;
    status: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED';
  } | null {
    const product = productStore.get(productId);
    if (!product) return null;

    const now = Date.now();
    const daysUntilExpiry = Math.floor((product.expiryDate - now) / (24 * 60 * 60 * 1000));

    let status: 'FRESH' | 'EXPIRING_SOON' | 'EXPIRED';
    if (daysUntilExpiry < 0) {
      status = 'EXPIRED';
    } else if (daysUntilExpiry < 3) {
      status = 'EXPIRING_SOON';
    } else {
      status = 'FRESH';
    }

    return {
      isFresh: daysUntilExpiry > 0,
      daysUntilExpiry: Math.max(0, daysUntilExpiry),
      status,
    };
  }
}

// Export singleton
export const productTraceabilityService = new ProductTraceabilityService();

// Export types
export type {
  TrackedProduct,
  TrackingEvent,
  ProductHistoryView,
  ProductCategory,
  TrackingEventType,
};
