using EkubCircle.Application.Interfaces;
using EkubCircle.Application.DTOs;
using EkubCircle.Domain.Enums;
using EkubCircle.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace EkubCircle.Application.Services;

public class CircleService(IApplicationDbContext db) : ICircleService
{
    public async Task<CircleSummaryDto> CreateAsync(int userId, CreateCircleRequest request)
    {
        if (request.ContributionAmount <= 0) throw new InvalidOperationException("Contribution must be greater than zero.");
        if (request.MemberLimit < 2) throw new InvalidOperationException("A circle must have at least 2 members.");
        if (string.IsNullOrWhiteSpace(request.Name)) throw new InvalidOperationException("Circle name is required.");

        var normalizedFrequency = request.Frequency?.Trim();
        if (string.IsNullOrWhiteSpace(normalizedFrequency) || !Enum.TryParse<Frequency>(normalizedFrequency, true, out var frequency) ||
            (frequency != Frequency.Weekly && frequency != Frequency.Monthly))
            throw new InvalidOperationException("Frequency must be Weekly or Monthly.");

        var organizer = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("User not found.");
        if (!organizer.FaydaVerified) throw new UnauthorizedAccessException("Only verified users can create a circle.");

        var circle = new Circle
        {
            Name = request.Name.Trim(),
            ContributionAmount = request.ContributionAmount,
            Frequency = frequency,
            MemberLimit = request.MemberLimit,
            OrganizerId = userId,
            StartDate = request.StartDate.HasValue
                ? DateTime.SpecifyKind(request.StartDate.Value, DateTimeKind.Utc)
                : null,
            Status = CircleStatus.Open
        };
        db.Circles.Add(circle);
        await db.SaveChangesAsync();

        db.CircleMemberships.Add(new CircleMembership
        {
            CircleId = circle.Id,
            UserId = userId,
            RoleInCircle = "Organizer + Member",
            MembershipStatus = MembershipStatus.Active
        });
        await db.SaveChangesAsync();

        return await GetSummaryAsync(circle.Id);
    }

    public async Task<IReadOnlyList<CircleSummaryDto>> GetAvailableAsync(int userId, string? search, string? frequency)
    {
        var query = db.Circles.AsNoTracking()
            .Include(c => c.Organizer)
            .Include(c => c.Memberships)
            .Where(c => c.Status == CircleStatus.Open);

        if (!string.IsNullOrWhiteSpace(search))
            query = query.Where(c => c.Name.ToLower().Contains(search.Trim().ToLower()));
        if (!string.IsNullOrWhiteSpace(frequency) && Enum.TryParse<Frequency>(frequency, true, out var parsed))
            query = query.Where(c => c.Frequency == parsed);

        var circles = await query.OrderByDescending(c => c.CreatedAt).ToListAsync();
        return circles.Select(ToSummary).ToList();
    }

    public async Task<CircleDetailsDto> GetDetailsAsync(int circleId, int? requestingUserId = null)
    {
        var circle = await db.Circles
            .AsNoTracking()
            .Include(c => c.Organizer)
            .Include(c => c.Memberships).ThenInclude(m => m.User)
            .FirstOrDefaultAsync(c => c.Id == circleId)
            ?? throw new KeyNotFoundException("Circle not found.");

        var currentRound = await db.Rounds
            .Where(r => r.CircleId == circleId && r.Status == RoundStatus.Open)
            .OrderBy(r => r.RoundNumber)
            .FirstOrDefaultAsync();

        var paidMembershipIds = currentRound is null
            ? new HashSet<int>()
            : (await db.Payments.Where(p => p.RoundId == currentRound.Id).Select(p => p.MembershipId).ToListAsync()).ToHashSet();

        var receivedMembershipIds = (await db.Payouts
            .Where(p => p.Round.CircleId == circleId && p.Status == PayoutStatus.Completed)
            .Select(p => p.ReceiverMembershipId)
            .ToListAsync()).ToHashSet();

        var members = circle.Memberships
            .Where(m => m.MembershipStatus == MembershipStatus.Active)
            .OrderBy(m => m.PayoutOrder ?? int.MaxValue)
            .ThenBy(m => m.Id)
            .Select(m => new CircleMemberDto(
                m.Id,
                m.UserId,
                m.User.FullName,
                m.User.Email,
                m.RoleInCircle,
                m.PayoutOrder,
                m.MembershipStatus.ToString(),
                receivedMembershipIds.Contains(m.Id),
                paidMembershipIds.Contains(m.Id)))
            .ToList();

        return new CircleDetailsDto(circle.Id, circle.Name, circle.ContributionAmount,
            circle.Frequency.ToString(), circle.MemberLimit, circle.Status.ToString(),
            circle.Organizer.FullName, circle.StartDate, members);
    }

    public async Task JoinAsync(int userId, int circleId)
    {
        var circle = await db.Circles.Include(c => c.Memberships)
            .FirstOrDefaultAsync(c => c.Id == circleId)
            ?? throw new KeyNotFoundException("Circle not found.");

        var user = await db.Users.FindAsync(userId) ?? throw new KeyNotFoundException("User not found.");
        if (!user.FaydaVerified) throw new UnauthorizedAccessException("Only verified users can join a circle.");
        if (circle.Status != CircleStatus.Open) throw new InvalidOperationException("This circle is no longer accepting members.");
        if (circle.Memberships.Count(m => m.MembershipStatus == MembershipStatus.Active) >= circle.MemberLimit)
            throw new InvalidOperationException("This circle is already full.");
        if (circle.Memberships.Any(m => m.UserId == userId && m.MembershipStatus == MembershipStatus.Active))
            throw new InvalidOperationException("You are already an active member of this circle.");

        db.CircleMemberships.Add(new CircleMembership
        {
            CircleId = circleId,
            UserId = userId,
            RoleInCircle = "Member",
            MembershipStatus = MembershipStatus.Active
        });
        await db.SaveChangesAsync();
    }

    public async Task AddMemberAsync(int organizerId, int circleId, AddMemberRequest request)
    {
        var circle = await GetOwnedOpenCircleAsync(organizerId, circleId);
        if (circle.Memberships.Count(m => m.MembershipStatus == MembershipStatus.Active) >= circle.MemberLimit)
            throw new InvalidOperationException("This circle is already full.");

        var identifier = request.EmailOrPhone.Trim();
        var user = await db.Users.FirstOrDefaultAsync(u => u.Email == identifier.ToLower() || u.PhoneNumber == identifier)
                   ?? throw new KeyNotFoundException("User not found. The member must register first.");
        if (!user.FaydaVerified) throw new InvalidOperationException("Only verified users can be added.");
        if (circle.Memberships.Any(m => m.UserId == user.Id && m.MembershipStatus == MembershipStatus.Active))
            throw new InvalidOperationException("User is already a member of this circle.");

        db.CircleMemberships.Add(new CircleMembership
        {
            CircleId = circleId,
            UserId = user.Id,
            RoleInCircle = "Member",
            MembershipStatus = MembershipStatus.Active
        });
        await db.SaveChangesAsync();
    }

    public async Task StartAsync(int organizerId, int circleId)
    {
        var circle = await db.Circles.Include(c => c.Memberships)
            .FirstOrDefaultAsync(c => c.Id == circleId)
            ?? throw new KeyNotFoundException("Circle not found.");

        if (circle.OrganizerId != organizerId) throw new UnauthorizedAccessException("Only the organizer can start the circle.");
        if (circle.Status != CircleStatus.Open) throw new InvalidOperationException("Only an open circle can be started.");

        var members = circle.Memberships.Where(m => m.MembershipStatus == MembershipStatus.Active)
            .OrderBy(m => m.JoinedAt).ThenBy(m => m.Id).ToList();
        if (members.Count != circle.MemberLimit)
            throw new InvalidOperationException($"The circle must have all {circle.MemberLimit} members before it can start. Currently {members.Count} member(s) have joined.");

        for (var i = 0; i < members.Count; i++) members[i].PayoutOrder = i + 1;

        await using var transaction = await db.Database.BeginTransactionAsync();
        var startedAt = DateTime.UtcNow;
        circle.Status = CircleStatus.Active;
        circle.StartDate ??= startedAt;

        for (var i = 0; i < members.Count; i++)
        {
            db.Rounds.Add(new Round
            {
                CircleId = circle.Id,
                RoundNumber = i + 1,
                ReceiverMembershipId = members[i].Id,
                Status = RoundStatus.Open,
                OpenedAt = startedAt
            });
        }

        await db.SaveChangesAsync();
        await transaction.CommitAsync();
    }

    public async Task<IReadOnlyList<CircleSummaryDto>> GetMyCirclesAsync(int userId)
    {
        var circles = await db.Circles.AsNoTracking()
            .Where(c => c.Memberships.Any(m => m.UserId == userId && m.MembershipStatus == MembershipStatus.Active))
            .Include(c => c.Organizer)
            .Include(c => c.Memberships)
            .OrderByDescending(c => c.CreatedAt)
            .ToListAsync();
        return circles.Select(ToSummary).ToList();
    }

    private async Task<Circle> GetOwnedOpenCircleAsync(int organizerId, int circleId)
    {
        var circle = await db.Circles.Include(c => c.Memberships)
            .FirstOrDefaultAsync(c => c.Id == circleId)
            ?? throw new KeyNotFoundException("Circle not found.");
        if (circle.OrganizerId != organizerId) throw new UnauthorizedAccessException("Only the organizer can manage this circle.");
        if (circle.Status != CircleStatus.Open) throw new InvalidOperationException("Membership changes are locked after the circle starts.");
        return circle;
    }

    private async Task<CircleSummaryDto> GetSummaryAsync(int circleId)
    {
        var circle = await db.Circles.Include(c => c.Organizer).Include(c => c.Memberships)
            .FirstAsync(c => c.Id == circleId);
        return ToSummary(circle);
    }

    private static CircleSummaryDto ToSummary(Circle c) => new(
        c.Id, c.Name, c.ContributionAmount, c.Frequency.ToString(),
        c.Memberships.Count(m => m.MembershipStatus == MembershipStatus.Active),
        c.MemberLimit, c.Organizer.FullName, c.Status.ToString());
}
