class AuthResponse {
  final int userId;
  final String fullName;
  final String email;
  final String role;
  final String token;

  AuthResponse({
    required this.userId,
    required this.fullName,
    required this.email,
    required this.role,
    required this.token,
  });

  factory AuthResponse.fromJson(Map<String, dynamic> json) {
    return AuthResponse(
      userId: json['userId'] ?? 0,
      fullName: json['fullName'] ?? '',
      email: json['email'] ?? '',
      role: json['role'] ?? '',
      token: json['token'] ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'userId': userId,
    'fullName': fullName,
    'email': email,
    'role': role,
    'token': token,
  };
}

class RegisterResponse {
  final int userId;
  final String message;
  final String? demoOtp;

  RegisterResponse({
    required this.userId,
    required this.message,
    this.demoOtp,
  });

  factory RegisterResponse.fromJson(Map<String, dynamic> json) {
    return RegisterResponse(
      userId: json['userId'] ?? 0,
      message: json['message'] ?? '',
      demoOtp: json['demoOtp'],
    );
  }
}

class CircleSummary {
  final int id;
  final String name;
  final double contributionAmount;
  final String frequency;
  final int memberCount;
  final int memberLimit;
  final String organizerName;
  final String status;

  CircleSummary({
    required this.id,
    required this.name,
    required this.contributionAmount,
    required this.frequency,
    required this.memberCount,
    required this.memberLimit,
    required this.organizerName,
    required this.status,
  });

  factory CircleSummary.fromJson(Map<String, dynamic> json) {
    return CircleSummary(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      contributionAmount: (json['contributionAmount'] as num?)?.toDouble() ?? 0.0,
      frequency: json['frequency'] ?? '',
      memberCount: json['memberCount'] ?? 0,
      memberLimit: json['memberLimit'] ?? 0,
      organizerName: json['organizerName'] ?? '',
      status: json['status'] ?? '',
    );
  }
}

class CircleMember {
  final int membershipId;
  final int userId;
  final String fullName;
  final String email;
  final String roleInCircle;
  final int? payoutOrder;
  final String membershipStatus;
  final bool hasReceived;
  final bool paidCurrentRound;

  CircleMember({
    required this.membershipId,
    required this.userId,
    required this.fullName,
    required this.email,
    required this.roleInCircle,
    this.payoutOrder,
    required this.membershipStatus,
    required this.hasReceived,
    required this.paidCurrentRound,
  });

  factory CircleMember.fromJson(Map<String, dynamic> json) {
    return CircleMember(
      membershipId: json['membershipId'] ?? 0,
      userId: json['userId'] ?? 0,
      fullName: json['fullName'] ?? '',
      email: json['email'] ?? '',
      roleInCircle: json['roleInCircle'] ?? '',
      payoutOrder: json['payoutOrder'],
      membershipStatus: json['membershipStatus'] ?? '',
      hasReceived: json['hasReceived'] ?? false,
      paidCurrentRound: json['paidCurrentRound'] ?? false,
    );
  }
}

class CircleDetails {
  final int id;
  final String name;
  final double contributionAmount;
  final String frequency;
  final int memberLimit;
  final String status;
  final String organizerName;
  final String? startDate;
  final List<CircleMember> members;

  CircleDetails({
    required this.id,
    required this.name,
    required this.contributionAmount,
    required this.frequency,
    required this.memberLimit,
    required this.status,
    required this.organizerName,
    this.startDate,
    required this.members,
  });

  factory CircleDetails.fromJson(Map<String, dynamic> json) {
    final rawMembers = json['members'] as List<dynamic>? ?? [];
    return CircleDetails(
      id: json['id'] ?? 0,
      name: json['name'] ?? '',
      contributionAmount: (json['contributionAmount'] as num?)?.toDouble() ?? 0.0,
      frequency: json['frequency'] ?? '',
      memberLimit: json['memberLimit'] ?? 0,
      status: json['status'] ?? '',
      organizerName: json['organizerName'] ?? '',
      startDate: json['startDate'],
      members: rawMembers.map((m) => CircleMember.fromJson(m as Map<String, dynamic>)).toList(),
    );
  }
}

class Round {
  final int id;
  final int roundNumber;
  final String status;
  final double contribution;
  final double pot;
  final int paidCount;
  final int totalMembers;
  final int receiverMembershipId;
  final String receiverName;
  final bool receiverHasReceived;
  final String openedAt;
  final String? paidOutAt;
  final double? payoutAmount;

  Round({
    required this.id,
    required this.roundNumber,
    required this.status,
    required this.contribution,
    required this.pot,
    required this.paidCount,
    required this.totalMembers,
    required this.receiverMembershipId,
    required this.receiverName,
    required this.receiverHasReceived,
    required this.openedAt,
    this.paidOutAt,
    this.payoutAmount,
  });

  factory Round.fromJson(Map<String, dynamic> json) {
    return Round(
      id: json['id'] ?? 0,
      roundNumber: json['roundNumber'] ?? 0,
      status: json['status'] ?? '',
      contribution: (json['contribution'] as num?)?.toDouble() ?? 0.0,
      pot: (json['pot'] as num?)?.toDouble() ?? 0.0,
      paidCount: json['paidCount'] ?? 0,
      totalMembers: json['totalMembers'] ?? 0,
      receiverMembershipId: json['receiverMembershipId'] ?? 0,
      receiverName: json['receiverName'] ?? '',
      receiverHasReceived: json['receiverHasReceived'] ?? false,
      openedAt: json['openedAt'] ?? '',
      paidOutAt: json['paidOutAt'],
      payoutAmount: (json['payoutAmount'] as num?)?.toDouble(),
    );
  }
}

class HistoryItem {
  final int roundNumber;
  final String? paidOutAt;
  final String receiverName;
  final double pot;
  final String status;

  HistoryItem({
    required this.roundNumber,
    this.paidOutAt,
    required this.receiverName,
    required this.pot,
    required this.status,
  });

  factory HistoryItem.fromJson(Map<String, dynamic> json) {
    return HistoryItem(
      roundNumber: json['roundNumber'] ?? 0,
      paidOutAt: json['paidOutAt'],
      receiverName: json['receiverName'] ?? '',
      pot: (json['pot'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? '',
    );
  }
}

class PayoutResponse {
  final int roundId;
  final int roundNumber;
  final String receiverName;
  final double amount;
  final String status;
  final String message;

  PayoutResponse({
    required this.roundId,
    required this.roundNumber,
    required this.receiverName,
    required this.amount,
    required this.status,
    required this.message,
  });

  factory PayoutResponse.fromJson(Map<String, dynamic> json) {
    return PayoutResponse(
      roundId: json['roundId'] ?? 0,
      roundNumber: json['roundNumber'] ?? 0,
      receiverName: json['receiverName'] ?? '',
      amount: (json['amount'] as num?)?.toDouble() ?? 0.0,
      status: json['status'] ?? '',
      message: json['message'] ?? '',
    );
  }
}

class DashboardNextCircle {
  final int circleId;
  final String circleName;
  final double contributionAmount;
  final String frequency;
  final int roundNumber;
  final String receiverName;
  final bool ready;
  final String status;
  final String message;

  DashboardNextCircle({
    required this.circleId,
    required this.circleName,
    required this.contributionAmount,
    required this.frequency,
    required this.roundNumber,
    required this.receiverName,
    required this.ready,
    required this.status,
    required this.message,
  });

  factory DashboardNextCircle.fromJson(Map<String, dynamic> json) {
    return DashboardNextCircle(
      circleId: json['circleId'] ?? 0,
      circleName: json['circleName'] ?? '',
      contributionAmount: (json['contributionAmount'] as num?)?.toDouble() ?? 0.0,
      frequency: json['frequency'] ?? '',
      roundNumber: json['roundNumber'] ?? 0,
      receiverName: json['receiverName'] ?? '',
      ready: json['ready'] ?? false,
      status: json['status'] ?? '',
      message: json['message'] ?? '',
    );
  }
}

class DashboardSummary {
  final int activeCircles;
  final double totalContributions;
  final double totalPayoutsReceived;
  final DashboardNextCircle? nextPaymentCircle;
  final DashboardNextCircle? nextPayoutCircle;

  DashboardSummary({
    this.activeCircles = 0,
    this.totalContributions = 0,
    this.totalPayoutsReceived = 0,
    this.nextPaymentCircle,
    this.nextPayoutCircle,
  });

  factory DashboardSummary.fromJson(Map<String, dynamic> json) {
    return DashboardSummary(
      activeCircles: json['activeCircles'] ?? 0,
      totalContributions: (json['totalContributions'] as num?)?.toDouble() ?? 0.0,
      totalPayoutsReceived: (json['totalPayoutsReceived'] as num?)?.toDouble() ?? 0.0,
      nextPaymentCircle: json['nextPaymentCircle'] != null
          ? DashboardNextCircle.fromJson(json['nextPaymentCircle'] as Map<String, dynamic>)
          : null,
      nextPayoutCircle: json['nextPayoutCircle'] != null
          ? DashboardNextCircle.fromJson(json['nextPayoutCircle'] as Map<String, dynamic>)
          : null,
    );
  }
}

