namespace EkubCircle.Application.DTOs;

public record CreateCircleRequest(
    string Name,
    decimal ContributionAmount,
    string Frequency,
    int MemberLimit,
    DateTime? StartDate);

public record JoinCircleRequest(int CircleId);
public record AddMemberRequest(string EmailOrPhone);

// membershipId → payoutOrder mapping submitted by the organizer after rolling
public record StartRequest(List<MemberPayoutOrder>? PayoutOrder);
public record MemberPayoutOrder(int MembershipId, int Order);

public record CircleSummaryDto(
    int Id,
    string Name,
    decimal ContributionAmount,
    string Frequency,
    int MemberCount,
    int MemberLimit,
    string OrganizerName,
    string Status);

public record CircleMemberDto(
    int MembershipId,
    int UserId,
    string FullName,
    string Email,
    string RoleInCircle,
    int? PayoutOrder,
    string MembershipStatus,
    bool HasReceived,
    bool PaidCurrentRound);

public record CircleDetailsDto(
    int Id,
    string Name,
    decimal ContributionAmount,
    string Frequency,
    int MemberLimit,
    string Status,
    string OrganizerName,
    DateTime? StartDate,
    IReadOnlyList<CircleMemberDto> Members);
