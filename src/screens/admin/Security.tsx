/**
 * Admin Security Screen
 *
 * Security management and monitoring dashboard
 * - Security event monitoring
 * - Active session management
 * - Authentication settings
 * - Access control overview
 */

import React, { useState, useMemo } from 'react';
import { SecurityEvent, AuthSession } from '../../types';

// Mock security events
const mockSecurityEvents: SecurityEvent[] = [
  {
    id: 'SE-001',
    type: 'suspicious_activity',
    userId: 'USR-456',
    timestamp: new Date(Date.now() - 300000).toISOString(),
    ipAddress: '203.252.xxx.xxx',
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)',
    location: 'Seoul, KR',
    risk: 'high',
    handled: false,
  },
  {
    id: 'SE-002',
    type: 'login_failure',
    userId: 'USR-789',
    timestamp: new Date(Date.now() - 600000).toISOString(),
    ipAddress: '118.37.xxx.xxx',
    userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)',
    location: 'Jeonju, KR',
    risk: 'medium',
    handled: false,
  },
  {
    id: 'SE-003',
    type: 'password_change',
    userId: 'ADM-001',
    timestamp: new Date(Date.now() - 3600000).toISOString(),
    ipAddress: '192.168.xxx.xxx',
    userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)',
    location: 'Jeonju, KR',
    risk: 'low',
    handled: true,
  },
  {
    id: 'SE-004',
    type: 'login_success',
    userId: 'MER-123',
    timestamp: new Date(Date.now() - 7200000).toISOString(),
    ipAddress: '211.234.xxx.xxx',
    userAgent: 'Mozilla/5.0 (Android 14; Mobile)',
    location: 'Jeonju, KR',
    risk: 'low',
    handled: true,
  },
];

// Mock active sessions
const mockSessions: AuthSession[] = [
  {
    id: 'SES-001',
    userId: 'ADM-001',
    userType: 'admin',
    deviceId: 'DEV-MAC-001',
    ipAddress: '192.168.1.100',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
    expiresAt: new Date(Date.now() + 7200000).toISOString(),
    lastActiveAt: new Date(Date.now() - 60000).toISOString(),
    isActive: true,
  },
  {
    id: 'SES-002',
    userId: 'ADM-002',
    userType: 'admin',
    deviceId: 'DEV-WIN-001',
    ipAddress: '192.168.1.105',
    createdAt: new Date(Date.now() - 7200000).toISOString(),
    expiresAt: new Date(Date.now() + 3600000).toISOString(),
    lastActiveAt: new Date(Date.now() - 300000).toISOString(),
    isActive: true,
  },
];

const Security: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<'events' | 'sessions' | 'settings'>('events');
  const [riskFilter, setRiskFilter] = useState<'all' | 'critical' | 'high' | 'medium' | 'low'>('all');
  const [selectedEvent, setSelectedEvent] = useState<SecurityEvent | null>(null);

  // Security stats
  const stats = useMemo(() => {
    const unhandled = mockSecurityEvents.filter(e => !e.handled).length;
    const highRisk = mockSecurityEvents.filter(e => e.risk === 'high' || e.risk === 'critical').length;
    const activeSessions = mockSessions.filter(s => s.isActive).length;

    return {
      totalEvents: mockSecurityEvents.length,
      unhandledAlerts: unhandled,
      highRiskEvents: highRisk,
      activeSessions,
    };
  }, []);

  const filteredEvents = useMemo(() => {
    if (riskFilter === 'all') return mockSecurityEvents;
    return mockSecurityEvents.filter(e => e.risk === riskFilter);
  }, [riskFilter]);

  const getRiskColor = (risk: string) => {
    switch (risk) {
      case 'critical': return 'text-red-500 bg-red-500/20';
      case 'high': return 'text-orange-500 bg-orange-500/20';
      case 'medium': return 'text-yellow-500 bg-yellow-500/20';
      case 'low': return 'text-green-500 bg-green-500/20';
      default: return 'text-text-secondary bg-surface';
    }
  };

  const getEventTypeLabel = (type: string) => {
    switch (type) {
      case 'login_attempt': return '로그인 시도';
      case 'login_success': return '로그인 성공';
      case 'login_failure': return '로그인 실패';
      case 'password_change': return '비밀번호 변경';
      case 'suspicious_activity': return '의심스러운 활동';
      default: return type;
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'login_success': return 'check_circle';
      case 'login_failure': return 'cancel';
      case 'password_change': return 'key';
      case 'suspicious_activity': return 'warning';
      default: return 'info';
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);

    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    return date.toLocaleDateString('ko-KR');
  };

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-white">보안 센터</h1>
          <p className="text-text-secondary text-sm">플랫폼 보안 모니터링 및 관리</p>
        </div>
        <button className="p-2 bg-surface rounded-lg">
          <span className="material-symbols-outlined text-text-secondary">refresh</span>
        </button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-4 gap-2">
        <div className="bg-surface rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-white">{stats.totalEvents}</div>
          <div className="text-[10px] text-text-secondary">전체 이벤트</div>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-red-500">{stats.unhandledAlerts}</div>
          <div className="text-[10px] text-text-secondary">미처리</div>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-orange-500">{stats.highRiskEvents}</div>
          <div className="text-[10px] text-text-secondary">고위험</div>
        </div>
        <div className="bg-surface rounded-xl p-3 text-center">
          <div className="text-lg font-bold text-green-500">{stats.activeSessions}</div>
          <div className="text-[10px] text-text-secondary">세션</div>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 bg-surface rounded-lg">
        {(['events', 'sessions', 'settings'] as const).map((tab) => (
          <button
            key={tab}
            onClick={() => setSelectedTab(tab)}
            className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-all ${
              selectedTab === tab
                ? 'bg-primary text-background'
                : 'text-text-secondary hover:text-white'
            }`}
          >
            {tab === 'events' && '이벤트'}
            {tab === 'sessions' && '세션'}
            {tab === 'settings' && '설정'}
          </button>
        ))}
      </div>

      {/* Events Tab */}
      {selectedTab === 'events' && (
        <div className="space-y-3">
          {/* Risk Filter */}
          <div className="flex gap-2 overflow-x-auto no-scrollbar">
            {(['all', 'critical', 'high', 'medium', 'low'] as const).map((risk) => (
              <button
                key={risk}
                onClick={() => setRiskFilter(risk)}
                className={`px-3 py-1.5 rounded-full text-xs font-medium whitespace-nowrap transition-all ${
                  riskFilter === risk
                    ? 'bg-primary text-background'
                    : 'bg-surface text-text-secondary hover:text-white'
                }`}
              >
                {risk.charAt(0).toUpperCase() + risk.slice(1)}
              </button>
            ))}
          </div>

          {/* Event List */}
          <div className="space-y-2">
            {filteredEvents.map((event) => (
              <button
                key={event.id}
                onClick={() => setSelectedEvent(event)}
                className="w-full bg-surface rounded-xl p-3 text-left hover:bg-surface-highlight transition-colors"
              >
                <div className="flex items-start gap-3">
                  <div className={`p-2 rounded-lg ${getRiskColor(event.risk)}`}>
                    <span className="material-symbols-outlined text-lg">
                      {getEventIcon(event.type)}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-white text-sm truncate">
                        {getEventTypeLabel(event.type)}
                      </span>
                      <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${getRiskColor(event.risk)}`}>
                        {event.risk.toUpperCase()}
                      </span>
                    </div>
                    <div className="text-xs text-text-secondary mt-1">
                      사용자: {event.userId}
                    </div>
                    <div className="flex items-center gap-2 mt-1 text-[10px] text-text-muted">
                      <span>{event.ipAddress}</span>
                      <span>|</span>
                      <span>{event.location}</span>
                      <span>|</span>
                      <span>{formatTime(event.timestamp)}</span>
                    </div>
                  </div>
                  {!event.handled && (
                    <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
                  )}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Sessions Tab */}
      {selectedTab === 'sessions' && (
        <div className="space-y-2">
          {mockSessions.map((session) => (
            <div
              key={session.id}
              className="bg-surface rounded-xl p-4"
            >
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/20 rounded-lg">
                    <span className="material-symbols-outlined text-primary">
                      {session.userType === 'admin' ? 'admin_panel_settings' : 'person'}
                    </span>
                  </div>
                  <div>
                    <div className="font-medium text-white">{session.userId}</div>
                    <div className="text-xs text-text-secondary">
                      {session.userType.charAt(0).toUpperCase() + session.userType.slice(1)}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <span className={`w-2 h-2 rounded-full ${session.isActive ? 'bg-green-500' : 'bg-gray-500'}`} />
                  <span className="text-xs text-text-secondary">
                    {session.isActive ? '활성' : '비활성'}
                  </span>
                </div>
              </div>

              <div className="mt-3 pt-3 border-t border-background space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">IP 주소</span>
                  <span className="text-white">{session.ipAddress}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">기기</span>
                  <span className="text-white">{session.deviceId}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">마지막 활동</span>
                  <span className="text-white">{formatTime(session.lastActiveAt)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-text-secondary">만료 시간</span>
                  <span className="text-white">
                    {new Date(session.expiresAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <button className="w-full mt-3 py-2 bg-red-500/20 text-red-500 rounded-lg text-sm font-medium hover:bg-red-500/30 transition-colors">
                세션 취소
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Settings Tab */}
      {selectedTab === 'settings' && (
        <div className="space-y-4">
          {/* Authentication Settings */}
          <div className="bg-surface rounded-xl p-4">
            <h3 className="font-medium text-white mb-3">인증</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">2단계 인증</div>
                  <div className="text-xs text-text-secondary">관리자 접근 시 2FA 필수</div>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">세션 타임아웃</div>
                  <div className="text-xs text-text-secondary">비활성 시 자동 로그아웃</div>
                </div>
                <select className="bg-background text-white text-sm rounded-lg px-3 py-1.5 border border-surface">
                  <option>30분</option>
                  <option>1시간</option>
                  <option>2시간</option>
                </select>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">로그인 시도 제한</div>
                  <div className="text-xs text-text-secondary">실패 후 잠금</div>
                </div>
                <select className="bg-background text-white text-sm rounded-lg px-3 py-1.5 border border-surface">
                  <option>3회</option>
                  <option>5회</option>
                  <option>10회</option>
                </select>
              </div>
            </div>
          </div>

          {/* DID/VC Settings */}
          <div className="bg-surface rounded-xl p-4">
            <h3 className="font-medium text-white mb-3">DID 신원</h3>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">DID 검증</div>
                  <div className="text-xs text-text-secondary">관리자 작업 시 DID 필수</div>
                </div>
                <div className="w-12 h-6 bg-primary rounded-full relative">
                  <div className="absolute right-1 top-1 w-4 h-4 bg-white rounded-full" />
                </div>
              </div>
              <div className="flex items-center justify-between">
                <div>
                  <div className="text-sm text-white">자격증명 만료</div>
                  <div className="text-xs text-text-secondary">VC 유효 기간</div>
                </div>
                <select className="bg-background text-white text-sm rounded-lg px-3 py-1.5 border border-surface">
                  <option>90일</option>
                  <option>180일</option>
                  <option>365일</option>
                </select>
              </div>
            </div>
          </div>

          {/* IP Allowlist */}
          <div className="bg-surface rounded-xl p-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-medium text-white">IP 허용 목록</h3>
              <button className="text-xs text-primary">+ IP 추가</button>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between bg-background rounded-lg p-2">
                <span className="text-sm text-white">192.168.1.0/24</span>
                <span className="text-xs text-text-secondary">사무실 네트워크</span>
              </div>
              <div className="flex items-center justify-between bg-background rounded-lg p-2">
                <span className="text-sm text-white">10.0.0.0/8</span>
                <span className="text-xs text-text-secondary">VPN 네트워크</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Event Detail Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-end">
          <div className="w-full max-w-md mx-auto bg-surface rounded-t-3xl p-4 space-y-4 max-h-[80vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold text-white">보안 이벤트</h2>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-2 hover:bg-background rounded-lg transition-colors"
              >
                <span className="material-symbols-outlined text-text-secondary">close</span>
              </button>
            </div>

            <div className="flex items-center gap-3">
              <div className={`p-3 rounded-xl ${getRiskColor(selectedEvent.risk)}`}>
                <span className="material-symbols-outlined text-2xl">
                  {getEventIcon(selectedEvent.type)}
                </span>
              </div>
              <div>
                <div className="font-medium text-white">
                  {getEventTypeLabel(selectedEvent.type)}
                </div>
                <div className={`text-sm ${getRiskColor(selectedEvent.risk).split(' ')[0]}`}>
                  {selectedEvent.risk.toUpperCase()} 위험
                </div>
              </div>
            </div>

            <div className="bg-background rounded-xl p-4 space-y-3">
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">이벤트 ID</span>
                <span className="text-white text-sm font-mono">{selectedEvent.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">사용자 ID</span>
                <span className="text-white text-sm">{selectedEvent.userId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">시간</span>
                <span className="text-white text-sm">
                  {new Date(selectedEvent.timestamp).toLocaleString('ko-KR')}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">IP 주소</span>
                <span className="text-white text-sm font-mono">{selectedEvent.ipAddress}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">위치</span>
                <span className="text-white text-sm">{selectedEvent.location}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary text-sm">상태</span>
                <span className={`text-sm ${selectedEvent.handled ? 'text-green-500' : 'text-red-500'}`}>
                  {selectedEvent.handled ? '처리됨' : '대기 중'}
                </span>
              </div>
            </div>

            <div className="bg-background rounded-xl p-4">
              <div className="text-text-secondary text-sm mb-2">사용자 에이전트</div>
              <div className="text-white text-xs font-mono break-all">
                {selectedEvent.userAgent}
              </div>
            </div>

            {!selectedEvent.handled && (
              <div className="grid grid-cols-2 gap-3">
                <button className="py-3 bg-yellow-500/20 text-yellow-500 rounded-xl font-medium">
                  오탐으로 표시
                </button>
                <button className="py-3 bg-red-500 text-white rounded-xl font-medium">
                  사용자 차단
                </button>
              </div>
            )}

            <button
              onClick={() => setSelectedEvent(null)}
              className="w-full py-3 bg-surface-highlight text-white rounded-xl font-medium"
            >
              닫기
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Security;
