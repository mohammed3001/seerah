import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";
import "package:go_router/go_router.dart";
import "package:supabase_flutter/supabase_flutter.dart";

import "../../core/theme/colors.dart";

class RegisterScreen extends ConsumerStatefulWidget {
  const RegisterScreen({super.key});

  @override
  ConsumerState<RegisterScreen> createState() => _RegisterScreenState();
}

class _RegisterScreenState extends ConsumerState<RegisterScreen> {
  final _name = TextEditingController();
  final _email = TextEditingController();
  final _password = TextEditingController();
  final _formKey = GlobalKey<FormState>();
  bool _busy = false;
  bool _agreed = false;
  String? _error;
  String? _info;

  @override
  void dispose() {
    _name.dispose();
    _email.dispose();
    _password.dispose();
    super.dispose();
  }

  Future<void> _signUp() async {
    if (!_formKey.currentState!.validate()) return;
    if (!_agreed) {
      setState(() => _error = "يجب الموافقة على الشروط للمتابعة.");
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
      _info = null;
    });
    try {
      final res = await Supabase.instance.client.auth.signUp(
        email: _email.text.trim(),
        password: _password.text,
        data: {"full_name": _name.text.trim()},
      );
      // If email confirmation is enabled, the session is null and the user
      // must click a link before logging in. Show that message clearly.
      if (res.session == null) {
        setState(() =>
            _info = "أرسلنا لك بريد تأكيد. افتح الرابط ثم عد لتسجيل الدخول.");
      }
    } on AuthException catch (e) {
      setState(() => _error = _localize(e));
    } catch (e) {
      setState(() => _error = "حدث خطأ غير متوقع.");
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Scaffold(
      appBar: AppBar(
        leading: IconButton(
          icon: const Icon(Icons.arrow_back_rounded),
          onPressed: () => context.pop(),
        ),
      ),
      body: SafeArea(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
          child: Form(
            key: _formKey,
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Text("أنشئ حسابك",
                    style: theme.textTheme.headlineSmall
                        ?.copyWith(fontWeight: FontWeight.w800)),
                const SizedBox(height: 4),
                Text("ابدأ ببناء سيرتك خلال دقائق.",
                    style: theme.textTheme.bodyMedium?.copyWith(
                        color: theme.colorScheme.onSurface.withValues(
                      alpha: 0.6,
                    ))),
                const SizedBox(height: 24),
                TextFormField(
                  controller: _name,
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: "الاسم الكامل",
                    prefixIcon: Icon(Icons.person_outline_rounded),
                  ),
                  validator: (v) => v == null || v.trim().length < 2
                      ? "أدخل اسمًا صحيحًا"
                      : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _email,
                  keyboardType: TextInputType.emailAddress,
                  autofillHints: const [AutofillHints.email],
                  textInputAction: TextInputAction.next,
                  decoration: const InputDecoration(
                    labelText: "البريد الإلكتروني",
                    prefixIcon: Icon(Icons.alternate_email_rounded),
                  ),
                  validator: (v) =>
                      v == null || !v.contains("@") ? "بريد غير صالح" : null,
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _password,
                  obscureText: true,
                  autofillHints: const [AutofillHints.newPassword],
                  decoration: const InputDecoration(
                    labelText: "كلمة المرور",
                    prefixIcon: Icon(Icons.lock_outline_rounded),
                  ),
                  validator: (v) {
                    if (v == null || v.length < 8) {
                      return "كلمة المرور يجب أن تكون 8 أحرف على الأقل";
                    }
                    return null;
                  },
                ),
                const SizedBox(height: 8),
                CheckboxListTile(
                  value: _agreed,
                  onChanged: (v) => setState(() => _agreed = v ?? false),
                  controlAffinity: ListTileControlAffinity.leading,
                  contentPadding: EdgeInsets.zero,
                  title: const Text(
                    "أوافق على شروط الاستخدام وسياسة الخصوصية",
                    style: TextStyle(fontSize: 13),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 4),
                  Text(_error!,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: SeerahColors.error)),
                ],
                if (_info != null) ...[
                  const SizedBox(height: 4),
                  Text(_info!,
                      style: theme.textTheme.bodySmall
                          ?.copyWith(color: SeerahColors.success)),
                ],
                const SizedBox(height: 16),
                FilledButton(
                  onPressed: _busy ? null : _signUp,
                  child: _busy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                              strokeWidth: 2, color: Colors.white))
                      : const Text("إنشاء حساب"),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}

String _localize(AuthException e) {
  final m = e.message.toLowerCase();
  if (m.contains("already registered") || m.contains("already exists")) {
    return "البريد مسجَّل مسبقًا.";
  }
  if (m.contains("password")) {
    return "كلمة المرور لا تستوفي المتطلبات.";
  }
  return e.message;
}
