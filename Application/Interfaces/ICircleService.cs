using EkubCircle.Application.DTOs;

namespace EkubCircle.Application.Interfaces;

public interface ICircleService
{
    Task<CircleSummaryDto> CreateAsync(int userId, CreateCircleRequest request);
    Task<IReadOnlyList<CircleSummaryDto>> GetAvailableAsync(int userId, string? search, string? frequency);
    Task<CircleDetailsDto> GetDetailsAsync(int circleId, int? requestingUserId = null);
    Task JoinAsync(int userId, int circleId);
    Task AddMemberAsync(int organizerId, int circleId, AddMemberRequest request);
    Task StartAsync(int organizerId, int circleId, StartRequest? request = null);
    Task<IReadOnlyList<CircleSummaryDto>> GetMyCirclesAsync(int userId);
}
