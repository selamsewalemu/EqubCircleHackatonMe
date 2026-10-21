import 'dart:convert';
import 'package:flutter/foundation.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../models/models.dart';
import 'api_service.dart';
import 'realtime_service.dart';

class AuthService extends ChangeNotifier {
  static const String _userKey = 'ekub_auth_user';
  static const String _tokenKey = 'ekub_auth_token';
  static const String _pendingUserIdKey = 'ekub_pending_user_id';
  static const String _demoOtpKey = 'ekub_demo_otp';

  final ApiService _apiService;
  final RealtimeService _realtimeService;
  AuthResponse? _currentUser;
  bool _isLoading = true;
  String? _pendingDemoOtp;
  int? _pendingUserId;

  AuthService(this._apiService, this._realtimeService);

  AuthResponse? get currentUser => _currentUser;
  bool get isAuthenticated => _currentUser != null;
  bool get isLoading => _isLoading;
  String? get pendingDemoOtp => _pendingDemoOtp;
  int? get pendingUserId => _pendingUserId;

  Future<void> init() async {
    _isLoading = true;
    notifyListeners();

    try {
      await _apiService.init();
      final prefs = await SharedPreferences.getInstance();
      final token = prefs.getString(_tokenKey);
      final userJson = prefs.getString(_userKey);
      _pendingDemoOtp = prefs.getString(_demoOtpKey);
      _pendingUserId = prefs.getInt(_pendingUserIdKey);

      if (token != null && userJson != null) {
        final map = jsonDecode(userJson);
        _currentUser = AuthResponse.fromJson(map);
        _apiService.setToken(token);
        _realtimeService.connect(token, _apiService.baseUrl);
      }
    } catch (e) {
      if (kDebugMode) {
        print('Error loading auth session: $e');
      }
    } finally {
      _isLoading = false;
      notifyListeners();
    }
  }

  Future<RegisterResponse> register({
    required String fullName,
    required String phoneNumber,
    required String email,
    required String password,
    required String confirmPassword,
    required String faydaFanNumber,
  }) async {
    final response = await _apiService.register(
      fullName: fullName,
      phoneNumber: phoneNumber,
      email: email,
      password: password,
      confirmPassword: confirmPassword,
      faydaFanNumber: faydaFanNumber,
    );

    _pendingUserId = response.userId;
    _pendingDemoOtp = response.demoOtp;

    final prefs = await SharedPreferences.getInstance();
    await prefs.setInt(_pendingUserIdKey, response.userId);
    if (response.demoOtp != null) {
      await prefs.setString(_demoOtpKey, response.demoOtp!);
    }

    notifyListeners();
    return response;
  }

  Future<AuthResponse> verifyOtp(int userId, String otp) async {
    final response = await _apiService.verifyOtp(userId, otp);
    await _saveSession(response);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_pendingUserIdKey);
    await prefs.remove(_demoOtpKey);
    _pendingUserId = null;
    _pendingDemoOtp = null;

    notifyListeners();
    return response;
  }

  Future<AuthResponse> login(String emailOrPhone, String password) async {
    final response = await _apiService.login(emailOrPhone, password);
    await _saveSession(response);
    notifyListeners();
    return response;
  }

  Future<void> _saveSession(AuthResponse response) async {
    _currentUser = response;
    _apiService.setToken(response.token);

    final prefs = await SharedPreferences.getInstance();
    await prefs.setString(_tokenKey, response.token);
    await prefs.setString(_userKey, jsonEncode(response.toJson()));
    // Connect SignalR hub after session is persisted
    _realtimeService.connect(response.token, _apiService.baseUrl);
  }

  Future<void> logout() async {
    _currentUser = null;
    _apiService.setToken(null);

    final prefs = await SharedPreferences.getInstance();
    await prefs.remove(_tokenKey);
    await prefs.remove(_userKey);

    notifyListeners();
    await _realtimeService.disconnect();
  }
}

