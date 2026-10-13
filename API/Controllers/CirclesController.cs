using EkubCircle.Application.DTOs;
using EkubCircle.API.Extensions;
using EkubCircle.Application.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.SignalR;
using EkubCircle.API.Hubs;

namespace EkubCircle.API.Controllers;

[ApiController]
[Authorize]
[Route("api/circles")]
public class CirclesController(ICircleService circleService, IHubContext<NotificationHub> hub) : ControllerBase
{
    [HttpPost]
    public async Task<ActionResult<CircleSummaryDto>> Create(CreateCircleRequest request)
    {
        var result = await circleService.CreateAsync(User.GetUserId(), request);
        await hub.Clients.All.SendAsync("circleCreated", result);
        return CreatedAtAction(nameof(GetDetails), new { id = result.Id }, result);
    }

    [HttpGet("available")]
    public async Task<ActionResult<List<CircleSummaryDto>>> Available([FromQuery] string? search, [FromQuery] string? frequency) =>
        Ok((await circleService.GetAvailableAsync(User.GetUserId(), search, frequency)).ToList());

    [HttpGet("mine")]
    public async Task<ActionResult<List<CircleSummaryDto>>> Mine() =>
        Ok((await circleService.GetMyCirclesAsync(User.GetUserId())).ToList());

    [HttpGet("{id:int}")]
    public async Task<ActionResult<CircleDetailsDto>> GetDetails(int id) =>
        Ok(await circleService.GetDetailsAsync(id, User.GetUserId()));

    [HttpPost("{id:int}/join")]
    public async Task<IActionResult> Join(int id)
    {
        await circleService.JoinAsync(User.GetUserId(), id);
        await hub.Clients.All.SendAsync("memberJoined", new { circleId = id, userId = User.GetUserId() });
        return Ok(new { message = "Joined circle successfully." });
    }

    [HttpPost("{id:int}/members")]
    public async Task<IActionResult> AddMember(int id, AddMemberRequest request)
    {
        await circleService.AddMemberAsync(User.GetUserId(), id, request);
        await hub.Clients.All.SendAsync("memberJoined", new { circleId = id, identifier = request.EmailOrPhone });
        return Ok(new { message = "Member added successfully." });
    }

    [HttpPost("{id:int}/start")]
    public async Task<IActionResult> Start(int id, [FromBody] StartRequest? request = null)
    {
        await circleService.StartAsync(User.GetUserId(), id, request);
        await hub.Clients.All.SendAsync("circleStarted", new { circleId = id });
        return Ok(new { message = "Circle started. Membership and payout order are now locked." });
    }
}
