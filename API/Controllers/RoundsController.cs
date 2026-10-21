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
[Route("api")]
public class RoundsController(IRoundService roundService, IHubContext<NotificationHub> hub) : ControllerBase
{
    [HttpGet("circles/{circleId:int}/current-round")]
    public async Task<ActionResult<RoundDto>> Current(int circleId) =>
        Ok(await roundService.GetCurrentAsync(User.GetUserId(), circleId));

    [HttpGet("circles/{circleId:int}/rounds")]
    public async Task<ActionResult<List<RoundDto>>> Rounds(int circleId) =>
        Ok((await roundService.GetRoundsAsync(User.GetUserId(), circleId)).ToList());

    [HttpGet("circles/{circleId:int}/history")]
    public async Task<ActionResult<List<HistoryItemDto>>> History(int circleId) =>
        Ok((await roundService.GetHistoryAsync(User.GetUserId(), circleId)).ToList());

    [HttpPost("rounds/{roundId:int}/payments/{membershipId:int}")]
    public async Task<IActionResult> MarkPayment(int roundId, int membershipId, MarkPaymentRequest request)
    {
        var result = await roundService.MarkPaymentAsync(User.GetUserId(), roundId, membershipId, request);
        await hub.Clients.All.SendAsync("paymentRecorded", new { result.RoundId, result.CircleId, result.MembershipId, result.Amount });
        return Ok(result);
    }

    [HttpPost("circles/{circleId:int}/payout")]
    public async Task<ActionResult<PayoutResponse>> Payout(int circleId) =>
        Ok(await PayoutAndNotify(circleId));
    private async Task<PayoutResponse> PayoutAndNotify(int circleId)
    {
        var result = await roundService.PayoutAsync(User.GetUserId(), circleId);
        await hub.Clients.All.SendAsync("payoutCompleted", new { circleId, result.RoundId, result.RoundNumber, result.ReceiverName, result.Amount });
        return result;
    }
}
