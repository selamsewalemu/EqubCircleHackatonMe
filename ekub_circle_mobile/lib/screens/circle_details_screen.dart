import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:provider/provider.dart';
import '../models/models.dart';
import '../services/api_service.dart';
import '../services/auth_service.dart';
import '../services/realtime_service.dart';
import '../theme/app_theme.dart';
import '../widgets/common_widgets.dart';

class CircleDetailsScreen extends StatefulWidget {
  final int circleId;

  const CircleDetailsScreen({
    super.key,
    required this.circleId,
  });

  @override
  State<CircleDetailsScreen> createState() => _CircleDetailsScreenState();
}

class _CircleDetailsScreenState extends State<CircleDetailsScreen> {
  bool _isLoading = true;
  String? _errorMessage;
  CircleDetails? _circle;
  Round? _currentRound;
  List<HistoryItem> _history = [];

  bool _isActionLoading = false;
  final TextEditingController _addMemberController = TextEditingController();
  StreamSubscription<RealtimeEvent>? _realtimeSub;

  @override
  void initState() {
    super.initState();
    _loadCircleData();
    _realtimeSub = context.read<RealtimeService>().events.listen((event) {
      final eventCircleId = (event.data is Map)
          ? (event.data as Map)['circleId'] as int?
          : null;
      if (eventCircleId == null || eventCircleId == widget.circleId) {
        _loadCircleData();
      }
    });
  }

  @override
  void dispose() {
    _realtimeSub?.cancel();
    _addMemberController.dispose();
    super.dispose();
  }

  Future<void> _loadCircleData() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    final api = context.read<ApiService>();

    try {
      final circle = await api.getCircleDetails(widget.circleId);
      Round? round;
      if (circle.status.toLowerCase() == 'active') {
        round = await api.getCurrentRound(widget.circleId);
      }
      final history = await api.getHistory(widget.circleId);

      if (mounted) {
        setState(() {
          _circle = circle;
          _currentRound = round;
          _history = history;
          _isLoading = false;
        });
      }
    } catch (e) {
      if (mounted) {
        setState(() {
          _errorMessage = e.toString();
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _joinCircle() async {
    setState(() => _isActionLoading = true);
    final api = context.read<ApiService>();

    try {
      await api.joinCircle(widget.circleId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Joined circle successfully!')),
        );
        _loadCircleData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  Future<void> _addMember() async {
    final identifier = _addMemberController.text.trim();
    if (identifier.isEmpty) return;

    setState(() => _isActionLoading = true);
    final api = context.read<ApiService>();

    try {
      await api.addMember(widget.circleId, identifier);
      _addMemberController.clear();
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Added member: $identifier')),
        );
        _loadCircleData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  Future<void> _startCircle() async {
    setState(() => _isActionLoading = true);
    final api = context.read<ApiService>();

    try {
      await api.startCircle(widget.circleId);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Circle started! Payout order has been locked.')),
        );
        _loadCircleData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  Future<void> _payContribution(int membershipId, double amount, {bool isSelf = true}) async {
    if (_currentRound == null) return;
    setState(() => _isActionLoading = true);
    final api = context.read<ApiService>();

    try {
      await api.recordPayment(
        _currentRound!.id,
        membershipId,
        amount,
        referenceNote: isSelf ? 'Member payment' : 'Organizer recorded payment',
      );

      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            content: Text(isSelf ? 'Payment recorded successfully!' : 'Member payment recorded!'),
            backgroundColor: AppTheme.statusActive,
          ),
        );
        _loadCircleData();
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payment failed: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  Future<void> _triggerPayout() async {
    setState(() => _isActionLoading = true);
    final api = context.read<ApiService>();

    try {
      final res = await api.payout(widget.circleId);
      if (mounted) {
        showDialog(
          context: context,
          builder: (_) => AlertDialog(
            title: const Row(
              children: [
                Icon(Icons.check_circle_outline, color: AppTheme.statusActive),
                SizedBox(width: 8),
                Text('Payout Successful'),
              ],
            ),
            content: Text(
              'Round ${res.roundNumber} payout of ${currencyFormat.format(res.amount)} ETB transferred to ${res.receiverName}.\n\n${res.message}',
            ),
            actions: [
              TextButton(
                onPressed: () {
                  Navigator.pop(context);
                  _loadCircleData();
                },
                child: const Text('OK'),
              ),
            ],
          ),
        );
      }
    } catch (e) {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Payout error: $e'), backgroundColor: Colors.red),
        );
      }
    } finally {
      if (mounted) setState(() => _isActionLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final user = context.watch<AuthService>().currentUser;
    final isOrganizer = _circle != null && _circle!.organizerName == user?.fullName;
    final myMembership = _circle?.members.cast<CircleMember?>().firstWhere(
          (m) => m?.userId == user?.userId,
          orElse: () => null,
        );

    final isMember = myMembership != null;

    return Scaffold(
      appBar: AppBar(
        title: Text(_circle?.name ?? 'Circle Details'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh_rounded),
            onPressed: _loadCircleData,
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _loadCircleData,
        child: _isLoading
            ? const Center(child: CircularProgressIndicator())
            : _circle == null
                ? Center(
                    child: Column(
                      mainAxisAlignment: MainAxisAlignment.center,
                      children: [
                        Text(_errorMessage ?? 'Circle not found'),
                        const SizedBox(height: 12),
                        ElevatedButton(
                          onPressed: _loadCircleData,
                          child: const Text('Retry'),
                        ),
                      ],
                    ),
                  )
                : SingleChildScrollView(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        // Circle Header Card
                        _buildCircleHeader(_circle!),

                        const SizedBox(height: 16),

                        // Action / Round Card based on status
                        if (_circle!.status.toLowerCase() == 'active' && _currentRound != null)
                          _buildCurrentRoundCard(
                            _circle!,
                            _currentRound!,
                            isOrganizer,
                            myMembership,
                          )
                        else if (_circle!.status.toLowerCase() == 'open')
                          _buildPreparationCard(_circle!, isOrganizer, isMember)
                        else if (_circle!.status.toLowerCase() == 'completed')
                          _buildCompletedCard(),

                        const SizedBox(height: 24),

                        // Members Section
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Text(
                              'Members (${_circle!.members.length}/${_circle!.memberLimit})',
                              style: const TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w700,
                                color: AppTheme.textPrimary,
                              ),
                            ),
                            if (isOrganizer && _circle!.status.toLowerCase() == 'open')
                              Text(
                                '${_circle!.memberLimit - _circle!.members.length} spots left',
                                style: const TextStyle(fontSize: 12, color: AppTheme.primary),
                              ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        _buildMemberList(_circle!, isOrganizer),

                        const SizedBox(height: 24),

                        // Round History Section
                        const Text(
                          'Round History',
                          style: TextStyle(
                            fontSize: 18,
                            fontWeight: FontWeight.w700,
                            color: AppTheme.textPrimary,
                          ),
                        ),
                        const SizedBox(height: 10),
                        _buildHistoryList(),

                        const SizedBox(height: 40),
                      ],
                    ),
                  ),
      ),
    );
  }

  Widget _buildCircleHeader(CircleDetails c) {
    String startDateFormatted = 'Not set';
    if (c.startDate != null) {
      try {
        final parsed = DateTime.parse(c.startDate!);
        startDateFormatted = DateFormat('MMM d, yyyy').format(parsed);
      } catch (_) {}
    }

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                StatusBadge(status: c.status, isLarge: true),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: Text(
                    c.frequency,
                    style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 12),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Text(
              c.name,
              style: const TextStyle(
                fontSize: 22,
                fontWeight: FontWeight.w800,
                color: AppTheme.textPrimary,
              ),
            ),
            const SizedBox(height: 4),
            Text(
              'Organized by ${c.organizerName}',
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const Divider(height: 24),
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceAround,
              children: [
                _buildHeaderStat('Contribution', '${currencyFormat.format(c.contributionAmount)} ETB'),
                Container(height: 28, width: 1, color: AppTheme.border),
                _buildHeaderStat('Members', '${c.members.length} / ${c.memberLimit}'),
                Container(height: 28, width: 1, color: AppTheme.border),
                _buildHeaderStat('Start Date', startDateFormatted),
              ],
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHeaderStat(String label, String value) {
    return Column(
      children: [
        Text(
          label,
          style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
        ),
        const SizedBox(height: 2),
        Text(
          value,
          style: const TextStyle(
            fontSize: 13,
            fontWeight: FontWeight.bold,
            color: AppTheme.textPrimary,
          ),
        ),
      ],
    );
  }

  Widget _buildCurrentRoundCard(
    CircleDetails c,
    Round r,
    bool isOrganizer,
    CircleMember? myMembership,
  ) {
    final progress = r.totalMembers > 0 ? (r.paidCount / r.totalMembers) : 0.0;
    final allPaid = r.paidCount >= r.totalMembers;
    final hasPaid = myMembership?.paidCurrentRound ?? false;

    return Card(
      color: Colors.white,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(16),
        side: const BorderSide(color: AppTheme.primary, width: 1.5),
      ),
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                Row(
                  children: [
                    const Icon(Icons.sync_rounded, color: AppTheme.primary, size: 20),
                    const SizedBox(width: 6),
                    Text(
                      'ROUND ${r.roundNumber}',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.w800,
                        color: AppTheme.primary,
                        letterSpacing: 0.5,
                      ),
                    ),
                  ],
                ),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                  decoration: BoxDecoration(
                    color: allPaid ? AppTheme.statusActiveBg : Colors.grey.shade100,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(
                    '${r.paidCount} of ${r.totalMembers} paid',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.bold,
                      color: allPaid ? AppTheme.statusActive : AppTheme.textSecondary,
                    ),
                  ),
                ),
              ],
            ),
            const SizedBox(height: 16),
            Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Current Pot', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                      Text(
                        '${currencyFormat.format(r.pot)} ETB',
                        style: const TextStyle(
                          fontSize: 22,
                          fontWeight: FontWeight.w900,
                          color: AppTheme.primary,
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('Receiver This Round', style: TextStyle(fontSize: 11, color: AppTheme.textMuted)),
                      Text(
                        r.receiverName,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: const TextStyle(
                          fontSize: 15,
                          fontWeight: FontWeight.w800,
                          color: AppTheme.textPrimary,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 14),
            // Progress Bar
            ClipRRect(
              borderRadius: BorderRadius.circular(8),
              child: LinearProgressIndicator(
                value: progress,
                minHeight: 8,
                backgroundColor: Colors.grey.shade200,
                valueColor: AlwaysStoppedAnimation<Color>(
                  allPaid ? AppTheme.statusActive : AppTheme.primary,
                ),
              ),
            ),
            const SizedBox(height: 16),

            // Member pay button
            if (myMembership != null && !hasPaid) ...[
              ElevatedButton.icon(
                icon: const Icon(Icons.payment_rounded),
                label: Text(
                  'Pay My Contribution (${currencyFormat.format(r.contribution)} ETB)',
                ),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: _isActionLoading
                    ? null
                    : () => _payContribution(myMembership.membershipId, r.contribution, isSelf: true),
              ),
              const SizedBox(height: 6),
              const Center(
                child: Text(
                  'Simulated instant payment',
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
              ),
            ],

            // Organizer Payout button
            if (isOrganizer) ...[
              if (myMembership != null && !hasPaid) const SizedBox(height: 12),
              ElevatedButton.icon(
                icon: const Icon(Icons.savings_rounded),
                label: const Text('Pay Out Current Round'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: allPaid ? AppTheme.accentGold : Colors.grey.shade400,
                  foregroundColor: Colors.white,
                  minimumSize: const Size.fromHeight(48),
                ),
                onPressed: (!allPaid || _isActionLoading) ? null : _triggerPayout,
              ),
              if (!allPaid)
                const Padding(
                  padding: EdgeInsets.only(top: 6),
                  child: Center(
                    child: Text(
                      'Payout unlocks when every member has paid for this round.',
                      style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                    ),
                  ),
                ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildPreparationCard(CircleDetails c, bool isOrganizer, bool isMember) {
    final spotsRemaining = c.memberLimit - c.members.length;
    final isFull = spotsRemaining <= 0;

    return Card(
      child: Padding(
        padding: const EdgeInsets.all(18),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                const Icon(Icons.group_add_outlined, color: AppTheme.primary, size: 22),
                const SizedBox(width: 8),
                Text(
                  isOrganizer ? 'Prepare Circle' : 'Circle Invitation',
                  style: const TextStyle(
                    fontSize: 16,
                    fontWeight: FontWeight.bold,
                    color: AppTheme.textPrimary,
                  ),
                ),
              ],
            ),
            const SizedBox(height: 8),
            Text(
              isFull
                  ? 'All ${c.memberLimit} members have joined! The circle is ready to be started.'
                  : '$spotsRemaining member(s) still need to join before the circle can start.',
              style: const TextStyle(fontSize: 13, color: AppTheme.textSecondary),
            ),
            const SizedBox(height: 16),

            if (isOrganizer) ...[
              // Add member field
              Row(
                children: [
                  Expanded(
                    child: TextField(
                      controller: _addMemberController,
                      decoration: const InputDecoration(
                        hintText: 'Member email or phone',
                        isDense: true,
                        contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 12),
                      ),
                    ),
                  ),
                  const SizedBox(width: 8),
                  OutlinedButton(
                    onPressed: _isActionLoading ? null : _addMember,
                    child: const Text('Add'),
                  ),
                ],
              ),
              const SizedBox(height: 16),
              ElevatedButton.icon(
                icon: const Icon(Icons.play_arrow_rounded),
                label: const Text('Start Circle & Lock Order'),
                style: ElevatedButton.styleFrom(
                  minimumSize: const Size.fromHeight(46),
                ),
                onPressed: (!isFull || _isActionLoading) ? null : _startCircle,
              ),
              const SizedBox(height: 6),
              const Center(
                child: Text(
                  'Starting assigns fixed payout orders and creates rounds.',
                  style: TextStyle(fontSize: 11, color: AppTheme.textMuted),
                ),
              ),
            ] else if (!isMember) ...[
              ElevatedButton.icon(
                icon: const Icon(Icons.person_add_rounded),
                label: const Text('Join This Circle'),
                style: ElevatedButton.styleFrom(minimumSize: const Size.fromHeight(46)),
                onPressed: _isActionLoading ? null : _joinCircle,
              ),
            ],
          ],
        ),
      ),
    );
  }

  Widget _buildCompletedCard() {
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(20),
      decoration: BoxDecoration(
        color: AppTheme.statusCompletedBg,
        borderRadius: BorderRadius.circular(16),
        border: Border.all(color: AppTheme.statusCompleted.withValues(alpha: 0.3)),
      ),
      child: const Column(
        children: [
          Icon(Icons.celebration_rounded, color: AppTheme.statusCompleted, size: 40),
          SizedBox(height: 8),
          Text(
            'Circle Completed 🎉',
            style: TextStyle(
              fontSize: 18,
              fontWeight: FontWeight.bold,
              color: AppTheme.statusCompleted,
            ),
          ),
          SizedBox(height: 4),
          Text(
            'Every active member has received the Ekub payout once.',
            textAlign: TextAlign.center,
            style: TextStyle(fontSize: 13, color: AppTheme.textSecondary),
          ),
        ],
      ),
    );
  }

  Widget _buildMemberList(CircleDetails c, bool isOrganizer) {
    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: c.members.length,
      separatorBuilder: (context, index) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final m = c.members[index];
        final isRoundActive = _circle?.status.toLowerCase() == 'active';
        final canRecordForMember = isOrganizer && isRoundActive && !m.paidCurrentRound;

        return Card(
          child: Padding(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            child: Row(
              children: [
                UserAvatar(name: m.fullName, radius: 20),
                const SizedBox(width: 12),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        m.fullName,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                      ),
                      const SizedBox(height: 2),
                      Row(
                        children: [
                          Text(
                            m.roleInCircle,
                            style: const TextStyle(fontSize: 11, color: AppTheme.textMuted),
                          ),
                          if (m.payoutOrder != null) ...[
                            const Text(' • ', style: TextStyle(color: AppTheme.textMuted)),
                            Text(
                              'Order #${m.payoutOrder}',
                              style: const TextStyle(
                                fontSize: 11,
                                fontWeight: FontWeight.w600,
                                color: AppTheme.primary,
                              ),
                            ),
                          ],
                        ],
                      ),
                    ],
                  ),
                ),
                // Status chips / action
                if (m.paidCurrentRound)
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.statusActiveBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      '✓ Paid',
                      style: TextStyle(
                        fontSize: 11,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.statusActive,
                      ),
                    ),
                  )
                else if (canRecordForMember)
                  OutlinedButton(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                      visualDensity: VisualDensity.compact,
                    ),
                    onPressed: _isActionLoading
                        ? null
                        : () => _payContribution(m.membershipId, _circle!.contributionAmount, isSelf: false),
                    child: const Text('Record Pay', style: TextStyle(fontSize: 11)),
                  ),

                if (m.hasReceived) ...[
                  const SizedBox(width: 6),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                    decoration: BoxDecoration(
                      color: AppTheme.statusCompletedBg,
                      borderRadius: BorderRadius.circular(8),
                    ),
                    child: const Text(
                      'Received',
                      style: TextStyle(
                        fontSize: 10,
                        fontWeight: FontWeight.bold,
                        color: AppTheme.statusCompleted,
                      ),
                    ),
                  ),
                ],
              ],
            ),
          ),
        );
      },
    );
  }

  Widget _buildHistoryList() {
    if (_history.isEmpty) {
      return Container(
        padding: const EdgeInsets.all(16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(12),
          border: Border.all(color: AppTheme.border),
        ),
        child: const Center(
          child: Text(
            'No completed rounds yet.',
            style: TextStyle(fontSize: 12, color: AppTheme.textMuted),
          ),
        ),
      );
    }

    return ListView.separated(
      shrinkWrap: true,
      physics: const NeverScrollableScrollPhysics(),
      itemCount: _history.length,
      separatorBuilder: (context, index) => const SizedBox(height: 8),
      itemBuilder: (context, index) {
        final h = _history[index];
        return Card(
          child: ListTile(
            dense: true,
            leading: CircleAvatar(
              backgroundColor: AppTheme.primaryLight.withValues(alpha: 0.15),
              child: Text(
                '#${h.roundNumber}',
                style: const TextStyle(
                  fontWeight: FontWeight.bold,
                  fontSize: 12,
                  color: AppTheme.primary,
                ),
              ),
            ),
            title: Text(
              h.receiverName,
              style: const TextStyle(fontWeight: FontWeight.bold),
            ),
            subtitle: Text(
              'Pot: ${currencyFormat.format(h.pot)} ETB',
              style: const TextStyle(color: AppTheme.textSecondary, fontSize: 12),
            ),
            trailing: StatusBadge(status: h.status),
          ),
        );
      },
    );
  }
}
