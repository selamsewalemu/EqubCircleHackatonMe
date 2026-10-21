import 'dart:async';
import 'dart:math';
import 'package:flutter/foundation.dart';
import 'package:signalr_netcore/signalr_client.dart';

class RealtimeEvent {
  final String type;
  final dynamic data;

  const RealtimeEvent({required this.type, this.data});
}

const List<String> _hubEvents = [
  'circleCreated',
  'memberJoined',
  'circleStarted',
  'paymentRecorded',
  'payoutCompleted',
];

class RealtimeService extends ChangeNotifier {
  HubConnection? _connection;
  bool _isConnected = false;
  bool _disposed = false;

  final StreamController<RealtimeEvent> _eventController =
      StreamController<RealtimeEvent>.broadcast();

  String? _token;
  String? _baseUrl;

  int _retryDelay = 2;
  static const int _maxRetryDelay = 30;

  Stream<RealtimeEvent> get events => _eventController.stream;
  bool get isConnected => _isConnected;

  Future<void> connect(String token, String baseUrl) async {
    _token = token;
    _baseUrl = baseUrl;
    _retryDelay = 2;
    await _doConnect();
  }

  Future<void> _doConnect() async {
    if (_disposed || _token == null || _baseUrl == null) return;

    // Close existing connection cleanly
    final existing = _connection;
    _connection = null;
    if (existing != null) {
      try {
        await existing.stop();
      } catch (_) {}
    }

    final hubUrl = '${_baseUrl!}/hubs/notifications';

    final options = HttpConnectionOptions(
      accessTokenFactory: () async => _token ?? '',
      logMessageContent: false,
    );

    final conn = HubConnectionBuilder()
        .withUrl(hubUrl, options: options)
        .withAutomaticReconnect(
          retryDelays: List.generate(10, (i) => min(2000 * pow(2, i).toInt(), 30000)),
        )
        .build();

    for (final eventName in _hubEvents) {
      conn.on(eventName, (args) {
        if (!_disposed) {
          _eventController.add(RealtimeEvent(type: eventName, data: args?.isNotEmpty == true ? args![0] : null));
        }
      });
    }

    conn.onclose(({Exception? error}) {
      if (_disposed) return;
      _isConnected = false;
      notifyListeners();
      // Schedule reconnect with exponential backoff
      Future.delayed(Duration(seconds: _retryDelay), () {
        if (!_disposed && _token != null) {
          _retryDelay = min(_retryDelay * 2, _maxRetryDelay);
          _doConnect();
        }
      });
    });

    conn.onreconnecting(({Exception? error}) {
      if (_disposed) return;
      _isConnected = false;
      notifyListeners();
    });

    conn.onreconnected(({String? connectionId}) {
      if (_disposed) return;
      _isConnected = true;
      _retryDelay = 2;
      notifyListeners();
    });

    _connection = conn;

    try {
      await conn.start();
      if (!_disposed) {
        _isConnected = true;
        _retryDelay = 2;
        notifyListeners();
      }
    } catch (e) {
      if (kDebugMode) print('SignalR connect error: $e');
      if (!_disposed) {
        _isConnected = false;
        notifyListeners();
        // Retry with backoff
        Future.delayed(Duration(seconds: _retryDelay), () {
          if (!_disposed && _token != null) {
            _retryDelay = min(_retryDelay * 2, _maxRetryDelay);
            _doConnect();
          }
        });
      }
    }
  }

  Future<void> disconnect() async {
    _token = null;
    _baseUrl = null;
    final conn = _connection;
    _connection = null;
    _isConnected = false;
    notifyListeners();
    if (conn != null) {
      try {
        await conn.stop();
      } catch (_) {}
    }
  }

  @override
  void dispose() {
    _disposed = true;
    _eventController.close();
    _connection?.stop().catchError((_) {});
    super.dispose();
  }
}
