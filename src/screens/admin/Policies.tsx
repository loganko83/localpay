/**
 * Admin Policies Screen
 *
 * Policy management for local currency system
 * - View and manage policy rules
 * - Usage limits (daily, monthly, transaction)
 * - Region restrictions
 * - Merchant category rules
 * - User eligibility based on VC credentials
 */

import React, { useState, useMemo } from 'react';
import { Policy, PolicyRule, PolicyRuleType } from '../../services/policyEngine';

// Mock policies
const mockPolicies: Policy[] = [
  {
    id: 'POL-001',
    name: 'Jeonju Standard Policy',
    description: 'Standard usage policy for Jeonju City local currency',
    municipalityId: 'jeonju',
    status: 'active',
    effectiveFrom: '2024-01-01',
    effectiveUntil: '2024-12-31',
    createdBy: 'ADM-001',
    createdAt: '2024-01-01T00:00:00Z',
    updatedAt: '2024-06-15T10:30:00Z',
    rules: [
      {
        id: 'RULE-001',
        type: 'USAGE_LIMIT_TRANSACTION',
        enabled: true,
        priority: 1,
        parameters: { maxAmount: 500000 },
      },
      {
        id: 'RULE-002',
        type: 'USAGE_LIMIT_DAILY',
        enabled: true,
        priority: 2,
        parameters: { maxAmount: 500000 },
      },
      {
        id: 'RULE-003',
        type: 'USAGE_LIMIT_MONTHLY',
        enabled: true,
        priority: 3,
        parameters: { maxAmount: 2000000 },
      },
      {
        id: 'RULE-004',
        type: 'REGION_RESTRICTION',
        enabled: true,
        priority: 4,
        parameters: { regions: ['jeonju', 'wanju'] },
      },
    ],
  },
  {
    id: 'POL-002',
    name: 'Youth Discount Policy',
    description: 'Additional benefits for youth (19-34) with verified credentials',
    municipalityId: 'jeonju',
    status: 'active',
    effectiveFrom: '2024-03-01',
    effectiveUntil: '2024-12-31',
    createdBy: 'ADM-001',
    createdAt: '2024-03-01T00:00:00Z',
    updatedAt: '2024-03-01T00:00:00Z',
    rules: [
      {
        id: 'RULE-010',
        type: 'USER_ELIGIBILITY',
        enabled: true,
        priority: 1,
        parameters: { credentials: ['YOUTH'] },
      },
      {
        id: 'RULE-011',
        type: 'DISCOUNT_RATE',
        enabled: true,
        priority: 2,
        parameters: { rate: 0.05, maxDiscount: 10000 },
      },
    ],
  },
  {
    id: 'POL-003',
    name: 'Senior Discount Policy',
    description: 'Benefits for seniors (65+) with verified credentials',
    municipalityId: 'jeonju',
    status: 'paused',
    effectiveFrom: '2024-06-01',
    createdBy: 'ADM-002',
    createdAt: '2024-06-01T00:00:00Z',
    updatedAt: '2024-06-01T00:00:00Z',
    rules: [
      {
        id: 'RULE-020',
        type: 'USER_ELIGIBILITY',
        enabled: true,
        priority: 1,
        parameters: { credentials: ['SENIOR'] },
      },
      {
        id: 'RULE-021',
        type: 'DISCOUNT_RATE',
        enabled: true,
        priority: 2,
        parameters: { rate: 0.03, maxDiscount: 5000 },
      },
    ],
  },
];

const Policies: React.FC = () => {
  const [selectedPolicy, setSelectedPolicy] = useState<Policy | null>(null);
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'paused' | 'draft'>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);

  const filteredPolicies = useMemo(() => {
    if (statusFilter === 'all') return mockPolicies;
    return mockPolicies.filter(p => p.status === statusFilter);
  }, [statusFilter]);

  const getRuleTypeLabel = (type: PolicyRuleType) => {
    switch (type) {
      case 'REGION_RESTRICTION': return '지역 제한';
      case 'MERCHANT_CATEGORY': return '가맹점 업종';
      case 'USAGE_LIMIT_DAILY': return '일일 한도';
      case 'USAGE_LIMIT_MONTHLY': return '월간 한도';
      case 'USAGE_LIMIT_TRANSACTION': return '거래 한도';
      case 'TIME_RESTRICTION': return '시간 제한';
      case 'USER_ELIGIBILITY': return '사용자 자격';
      case 'DISCOUNT_RATE': return '할인율';
      case 'EXPIRATION': return '만료';
      default: return type;
    }
  };

  const getRuleIcon = (type: PolicyRuleType) => {
    switch (type) {
      case 'REGION_RESTRICTION': return 'location_on';
      case 'MERCHANT_CATEGORY': return 'store';
      case 'USAGE_LIMIT_DAILY': return 'today';
      case 'USAGE_LIMIT_MONTHLY': return 'calendar_month';
      case 'USAGE_LIMIT_TRANSACTION': return 'payments';
      case 'TIME_RESTRICTION': return 'schedule';
      case 'USER_ELIGIBILITY': return 'verified_user';
      case 'DISCOUNT_RATE': return 'discount';
      case 'EXPIRATION': return 'event_busy';
      default: return 'rule';
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'text-green-500 bg-green-500/20';
      case 'paused': return 'text-yellow-500 bg-yellow-500/20';
      case 'draft': return 'text-gray-500 bg-gray-500/20';
      case 'expired': return 'text-red-500 bg-red-500/20';
      default: return 'text-text-secondary bg-surface';
    }
  };

  const formatRuleValue = (rule: PolicyRule) => {
    const params = rule.parameters;
    switch (rule.type) {
      case 'USAGE_LIMIT_DAILY':
      case 'USAGE_LIMIT_MONTHLY':
      case 'USAGE_LIMIT_TRANSACTION':
        return `최대 ${(params.maxAmount as number).toLocaleString()}`;
      case 'REGION_RESTRICTION':
        return (params.regions as string[]).join(', ');
      case 'MERCHANT_CATEGORY':
        return (params.categories as string[]).join(', ');
      case 'USER_ELIGIBILITY':
        return (params.credentials as string[]).join(', ');
      case 'DISCOUNT_RATE':
        return `${((params.rate as number) * 100).toFixed(0)}% (max ${(params.maxDiscount as number).toLocaleString()})`;
      case 'TIME_RESTRICTION':
        return `${params.startHour}:00 - ${params.endHour}:00`;
      default:
        return JSON.stringify(params);
    }
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">정책 관리</h1>
          <p className="text-text-secondary text-sm">지역화폐 사용 정책 관리</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="p-2 bg-primary rounded-lg"
        >
          <span className="material-symbols-outlined text-background">add</span>
        </button>
      </div>

      {/* Regulatory Info */}
      <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
        <div className="flex items-start gap-2">
          <span className="material-symbols-outlined text-primary text-lg">info</span>
          <div>
            <div className="text-sm font-medium text-primary">선불수단 규정</div>
            <div className="text-xs text-primary/80 mt-1">
              최대 잔액: 3,000,000원 | 일일 충전: 500,000원 | 월간: 2,000,000원
            </div>
          </div>
        </div>
      </div>

      {/* Status Filter */}
      <div className="flex gap-2 overflow-x-auto no-scrollbar">
        {(['all', 'active', 'paused', 'draft'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-full text-sm font-medium whitespace-nowrap transition-all ${
              statusFilter === status
                ? 'bg-primary text-background'
                : 'bg-surface text-text-secondary hover:text-white'
            }`}
          >
            {status.charAt(0).toUpperCase() + status.slice(1)}
          </button>
        ))}
      </div>

      {/* Policy List */}
      <div className="space-y-3">
        {filteredPolicies.map((policy) => (
          <button
            key={policy.id}
            onClick={() => setSelectedPolicy(policy)}
            className="w-full bg-surface rounded-xl p-4 text-left hover:bg-surface-highlight transition-colors"
          >
            <div className="flex items-start justify-between">
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-white truncate">{policy.name}</span>
                  <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(policy.status)}`}>
                    {policy.status.toUpperCase()}
                  </span>
                </div>
                <p className="text-xs text-text-secondary mt-1 line-clamp-1">
                  {policy.description}
                </p>
              </div>
              <span className="material-symbols-outlined text-text-secondary">chevron_right</span>
            </div>

            <div className="flex items-center gap-4 mt-3 pt-3 border-t border-background">
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-text-secondary text-sm">rule</span>
                <span className="text-xs text-text-secondary">{policy.rules.length}개 규칙</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-text-secondary text-sm">location_city</span>
                <span className="text-xs text-text-secondary">{policy.municipalityId}</span>
              </div>
              <div className="flex items-center gap-1">
                <span className="material-symbols-outlined text-text-secondary text-sm">calendar_today</span>
                <span className="text-xs text-text-secondary">
                  {new Date(policy.effectiveFrom).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>

      {/* Policy Detail Modal */}
      {selectedPolicy && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-4 space-y-4 max-h-[85vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">정책 상세</h2>
              <button
                onClick={() => setSelectedPolicy(null)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>

            {/* Policy Info */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-white font-medium">{selectedPolicy.name}</span>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(selectedPolicy.status)}`}>
                  {selectedPolicy.status.toUpperCase()}
                </span>
              </div>
              <p className="text-sm text-text-secondary">{selectedPolicy.description}</p>
            </div>

            {/* Metadata */}
            <div className="bg-background rounded-xl p-3 space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">정책 ID</span>
                <span className="text-white font-mono text-xs">{selectedPolicy.id}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">지자체</span>
                <span className="text-white">{selectedPolicy.municipalityId}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">시행일</span>
                <span className="text-white">
                  {new Date(selectedPolicy.effectiveFrom).toLocaleDateString('ko-KR')}
                </span>
              </div>
              {selectedPolicy.effectiveUntil && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-secondary">종료일</span>
                  <span className="text-white">
                    {new Date(selectedPolicy.effectiveUntil).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">생성자</span>
                <span className="text-white">{selectedPolicy.createdBy}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-secondary">최종 수정</span>
                <span className="text-white">
                  {new Date(selectedPolicy.updatedAt).toLocaleDateString('ko-KR')}
                </span>
              </div>
            </div>

            {/* Rules */}
            <div>
              <h3 className="font-medium text-white mb-3">정책 규칙 ({selectedPolicy.rules.length}개)</h3>
              <div className="space-y-2">
                {selectedPolicy.rules.map((rule) => (
                  <div
                    key={rule.id}
                    className={`bg-background rounded-xl p-3 ${!rule.enabled ? 'opacity-50' : ''}`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className="material-symbols-outlined text-primary text-lg">
                          {getRuleIcon(rule.type)}
                        </span>
                        <div>
                          <div className="text-sm font-medium text-white">
                            {getRuleTypeLabel(rule.type)}
                          </div>
                          <div className="text-xs text-text-secondary">
                            {formatRuleValue(rule)}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-text-muted">P{rule.priority}</span>
                        <div className={`w-8 h-4 rounded-full ${rule.enabled ? 'bg-green-500' : 'bg-gray-500'} relative`}>
                          <div className={`absolute top-0.5 w-3 h-3 bg-white rounded-full transition-all ${rule.enabled ? 'right-0.5' : 'left-0.5'}`} />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Actions */}
            <div className="grid grid-cols-2 gap-3">
              <button className="py-3 bg-background text-white rounded-xl font-medium hover:bg-surface-highlight transition-colors">
                정책 수정
              </button>
              {selectedPolicy.status === 'active' ? (
                <button className="py-3 bg-yellow-500/20 text-yellow-500 rounded-xl font-medium">
                  정책 일시정지
                </button>
              ) : (
                <button className="py-3 bg-green-500/20 text-green-500 rounded-xl font-medium">
                  정책 활성화
                </button>
              )}
            </div>

            <button
              onClick={() => setSelectedPolicy(null)}
              className="w-full py-3 bg-surface-highlight text-white rounded-xl font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}

      {/* Create Policy Modal Placeholder */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-4 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">새 정책 생성</h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="text-sm text-text-secondary block mb-2">정책명</label>
                <input
                  type="text"
                  placeholder="정책명을 입력하세요"
                  className="w-full bg-background text-white rounded-xl px-4 py-3 border border-surface focus:border-primary outline-none"
                />
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-2">설명</label>
                <textarea
                  placeholder="정책 설명을 입력하세요"
                  rows={3}
                  className="w-full bg-background text-white rounded-xl px-4 py-3 border border-surface focus:border-primary outline-none resize-none"
                />
              </div>

              <div>
                <label className="text-sm text-text-secondary block mb-2">지자체</label>
                <select className="w-full bg-background text-white rounded-xl px-4 py-3 border border-surface focus:border-primary outline-none">
                  <option value="jeonju">전주</option>
                  <option value="wanju">완주</option>
                  <option value="gunsan">군산</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-sm text-text-secondary block mb-2">시행일</label>
                  <input
                    type="date"
                    className="w-full bg-background text-white rounded-xl px-4 py-3 border border-surface focus:border-primary outline-none"
                  />
                </div>
                <div>
                  <label className="text-sm text-text-secondary block mb-2">종료일</label>
                  <input
                    type="date"
                    className="w-full bg-background text-white rounded-xl px-4 py-3 border border-surface focus:border-primary outline-none"
                  />
                </div>
              </div>
            </div>

            <div className="bg-primary/10 border border-primary/30 rounded-xl p-3">
              <div className="flex items-center gap-2">
                <span className="material-symbols-outlined text-primary">lightbulb</span>
                <span className="text-sm text-primary">
                  정책 생성 후 규칙을 추가하세요
                </span>
              </div>
            </div>

            <button className="w-full py-3 bg-primary text-background rounded-xl font-medium">
              정책 생성
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Policies;
