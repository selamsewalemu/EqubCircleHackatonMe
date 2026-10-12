export interface RegisterRequest { fullName: string; phoneNumber: string; email: string; password: string; confirmPassword: string; FaydaFanNumber: string; }
export interface RegisterResponse { userId: number; message: string; demoOtp?: string | null; }
export interface VerifyOtpRequest { userId: number; otp: string; }
export interface LoginRequest { emailOrPhone: string; password: string; }
export interface AuthResponse { userId: number; fullName: string; email: string; role: string; token: string; }
export interface CreateCircleRequest { name: string; contributionAmount: number; frequency: string; memberLimit: number; startDate?: string | null; }
export interface CircleSummary { id: number; name: string; contributionAmount: number; frequency: string; memberCount: number; memberLimit: number; organizerName: string; status: string; }
export interface CircleMember { membershipId: number; userId: number; fullName: string; email: string; roleInCircle: string; payoutOrder?: number | null; membershipStatus: string; hasReceived: boolean; paidCurrentRound: boolean; }
export interface CircleDetails { id: number; name: string; contributionAmount: number; frequency: string; memberLimit: number; status: string; organizerName: string; startDate?: string | null; members: CircleMember[]; }
export interface Round { id: number; roundNumber: number; status: string; contribution: number; pot: number; paidCount: number; totalMembers: number; receiverMembershipId: number; receiverName: string; receiverHasReceived: boolean; openedAt: string; paidOutAt?: string | null; payoutAmount?: number | null; }
export interface HistoryItem { roundNumber: number; paidOutAt?: string | null; receiverName: string; pot: number; status: string; }
export interface PayoutResponse { roundId: number; roundNumber: number; receiverName: string; amount: number; status: string; message: string; }
export interface ApiError { message?: string; title?: string; errors?: Record<string, string[]>; }

export interface DashboardNextCircle { circleId: number; circleName: string; contributionAmount: number; frequency: string; roundNumber: number; receiverName: string; ready: boolean; status: string; message: string; }
export interface DashboardSummary { activeCircles: number; totalContributions: number; totalPayoutsReceived: number; nextPaymentCircle?: DashboardNextCircle | null; nextPayoutCircle?: DashboardNextCircle | null; }
