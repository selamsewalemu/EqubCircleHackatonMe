namespace EkubCircle.Application.DTOs;

public record DashboardNextCircleDto(
    int CircleId,
    string CircleName,
    decimal ContributionAmount,
    string Frequency,
    int RoundNumber,
    string ReceiverName,
    bool Ready,
    string Status,
    string Message);

public record DashboardSummaryDto(
    int ActiveCircles,
    decimal TotalContributions,
    decimal TotalPayoutsReceived,
    DashboardNextCircleDto? NextPaymentCircle,
    DashboardNextCircleDto? NextPayoutCircle);
