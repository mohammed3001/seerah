// =============================================================================
// ai_drawer.dart
// Bottom drawer with 4 tabs: enhance, generate, analyze, chat. Mirrors the web
// app's AIAssistantPanel. Open from any field's "AI" button (with field
// context) or from the editor app bar (no field context — generic mode).
// =============================================================================

import "dart:async";

import "package:flutter/material.dart";
import "package:flutter_riverpod/flutter_riverpod.dart";

import "../../../core/theme/colors.dart";
import "../providers/resume_editor_providers.dart";
import "../services/ai_service.dart";

/// Configuration passed when opening the drawer for a specific field.
class AiDrawerContext {
  const AiDrawerContext({
    required this.fieldType,
    required this.label,
    required this.currentText,
    required this.onAccept,
  });

  /// One of the EnhanceFieldType values: bio, job_title, education_description,
  /// experience_description, course_description, project_description,
  /// reference_description, hobby.
  final String fieldType;
  final String label;
  final String currentText;

  /// Called when the user taps "قبول" on a suggestion. Receives the language
  /// the suggestion targets ("ar" or "en") and the text to apply.
  final void Function(String lang, String text) onAccept;
}

Future<void> showAiDrawer(
  BuildContext context, {
  required String resumeId,
  required String editorLang,
  AiDrawerContext? fieldContext,
  Map<String, dynamic>? resumeContext,
}) {
  return showModalBottomSheet<void>(
    context: context,
    isScrollControlled: true,
    showDragHandle: true,
    useSafeArea: true,
    backgroundColor: Theme.of(context).colorScheme.surface,
    builder: (context) {
      return DraggableScrollableSheet(
        initialChildSize: 0.85,
        minChildSize: 0.4,
        maxChildSize: 0.95,
        expand: false,
        builder: (context, scrollController) {
          return _AiDrawerContent(
            resumeId: resumeId,
            editorLang: editorLang,
            fieldContext: fieldContext,
            resumeContext: resumeContext,
            scrollController: scrollController,
          );
        },
      );
    },
  );
}

class _AiDrawerContent extends ConsumerStatefulWidget {
  const _AiDrawerContent({
    required this.resumeId,
    required this.editorLang,
    required this.fieldContext,
    required this.resumeContext,
    required this.scrollController,
  });

  final String resumeId;
  final String editorLang;
  final AiDrawerContext? fieldContext;
  final Map<String, dynamic>? resumeContext;
  final ScrollController scrollController;

  @override
  ConsumerState<_AiDrawerContent> createState() => _AiDrawerContentState();
}

class _AiDrawerContentState extends ConsumerState<_AiDrawerContent>
    with SingleTickerProviderStateMixin {
  late final TabController _tabController;
  AIRateLimit? _lastRateLimit;

  @override
  void initState() {
    super.initState();
    // Start on "enhance" if a field was provided, "generate" otherwise.
    _tabController = TabController(
      length: 4,
      vsync: this,
      initialIndex: widget.fieldContext != null ? 0 : 1,
    );
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  void _onRateLimit(AIRateLimit? r) {
    if (r != null) setState(() => _lastRateLimit = r);
  }

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding:
          EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
      child: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 0),
            child: Row(
              children: [
                const Icon(Icons.auto_awesome_rounded,
                    color: SeerahColors.accent),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    "مساعد سيرة الذكي",
                    style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                  ),
                ),
                if (_lastRateLimit != null)
                  _RateLimitBadge(rateLimit: _lastRateLimit!),
              ],
            ),
          ),
          TabBar(
            controller: _tabController,
            isScrollable: true,
            tabAlignment: TabAlignment.start,
            tabs: const [
              Tab(text: "تحسين"),
              Tab(text: "توليد"),
              Tab(text: "تحليل"),
              Tab(text: "محادثة"),
            ],
          ),
          Expanded(
            child: TabBarView(
              controller: _tabController,
              children: [
                _EnhanceTab(
                  fieldContext: widget.fieldContext,
                  language: widget.editorLang,
                  resumeContext: widget.resumeContext,
                  scrollController: widget.scrollController,
                  onRateLimit: _onRateLimit,
                ),
                _GenerateTab(
                  language: widget.editorLang,
                  resumeContext: widget.resumeContext,
                  scrollController: widget.scrollController,
                  onRateLimit: _onRateLimit,
                  onItemsApplied: (sectionType, items) =>
                      Navigator.of(context).pop(),
                ),
                _AnalyzeTab(
                  language: widget.editorLang,
                  resumeContext: widget.resumeContext ?? const {},
                  scrollController: widget.scrollController,
                  onRateLimit: _onRateLimit,
                ),
                _ChatTab(
                  language: widget.editorLang,
                  resumeContext: widget.resumeContext,
                  scrollController: widget.scrollController,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

// -------- Rate-limit badge ---------------------------------------------------

class _RateLimitBadge extends StatelessWidget {
  const _RateLimitBadge({required this.rateLimit});
  final AIRateLimit rateLimit;

  @override
  Widget build(BuildContext context) {
    final ratio =
        rateLimit.limit == 0 ? 0.0 : rateLimit.remaining / rateLimit.limit;
    final color = ratio > 0.5
        ? SeerahColors.success
        : ratio > 0.2
            ? SeerahColors.warning
            : SeerahColors.error;
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
      decoration: BoxDecoration(
        color: color.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withValues(alpha: 0.4)),
      ),
      child: Text(
        "${rateLimit.remaining}/${rateLimit.limit}",
        style: TextStyle(
          fontSize: 12,
          fontWeight: FontWeight.w600,
          color: color,
        ),
      ),
    );
  }
}

// -------- Enhance tab --------------------------------------------------------

class _EnhanceTab extends ConsumerStatefulWidget {
  const _EnhanceTab({
    required this.fieldContext,
    required this.language,
    required this.resumeContext,
    required this.scrollController,
    required this.onRateLimit,
  });

  final AiDrawerContext? fieldContext;
  final String language;
  final Map<String, dynamic>? resumeContext;
  final ScrollController scrollController;
  final ValueChanged<AIRateLimit?> onRateLimit;

  @override
  ConsumerState<_EnhanceTab> createState() => _EnhanceTabState();
}

class _EnhanceTabState extends ConsumerState<_EnhanceTab> {
  bool _busy = false;
  String? _error;
  EnhanceTextResponse? _result;
  late TextEditingController _input;

  @override
  void initState() {
    super.initState();
    _input =
        TextEditingController(text: widget.fieldContext?.currentText ?? "");
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _run() async {
    if (widget.fieldContext == null) return;
    if (_input.text.trim().isEmpty) {
      setState(() => _error = "اكتب نصًا قبل الطلب.");
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ai = ref.read(aiServiceProvider);
      final response = await ai.enhanceText(
        fieldType: widget.fieldContext!.fieldType,
        currentText: _input.text,
        language: widget.language,
        resumeContext: widget.resumeContext,
      );
      widget.onRateLimit(response.rateLimit);
      setState(() => _result = response.data);
    } on AIException catch (e) {
      setState(
          () => _error = widget.language == "ar" ? e.messageAr : e.messageEn);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    if (widget.fieldContext == null) {
      return const _EmptyState(
        icon: Icons.touch_app_rounded,
        message: "افتح هذا التبويب من زر AI بجانب أي حقل لتحسينه.",
      );
    }

    return ListView(
      controller: widget.scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        Text(
          "الحقل: ${widget.fieldContext!.label}",
          style: Theme.of(context).textTheme.labelMedium,
        ),
        const SizedBox(height: 8),
        TextField(
          controller: _input,
          minLines: 4,
          maxLines: 10,
          decoration: const InputDecoration(
            hintText: "النص الحالي",
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _busy ? null : _run,
          icon: _busy
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.auto_awesome_rounded, size: 18),
          label: const Text("تحسين النص"),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          _ErrorBox(message: _error!),
        ],
        if (_result != null) ...[
          const SizedBox(height: 16),
          _SuggestionCard(
            label: widget.language == "ar"
                ? "النسخة المُحسَّنة"
                : "Enhanced version",
            text: widget.language == "ar"
                ? _result!.enhancedAr
                : _result!.enhancedEn,
            onAccept: () {
              widget.fieldContext!.onAccept(
                widget.language,
                widget.language == "ar"
                    ? _result!.enhancedAr
                    : _result!.enhancedEn,
              );
              Navigator.of(context).pop();
            },
          ),
          if (_result!.suggestions.isNotEmpty) ...[
            const SizedBox(height: 12),
            const Text("اقتراحات إضافية:"),
            const SizedBox(height: 6),
            ..._result!.suggestions.map(
              (s) => Padding(
                padding: const EdgeInsetsDirectional.only(start: 12, top: 4),
                child: Text("• $s"),
              ),
            ),
          ],
        ],
      ],
    );
  }
}

// -------- Generate tab -------------------------------------------------------

class _GenerateTab extends ConsumerStatefulWidget {
  const _GenerateTab({
    required this.language,
    required this.resumeContext,
    required this.scrollController,
    required this.onRateLimit,
    required this.onItemsApplied,
  });

  final String language;
  final Map<String, dynamic>? resumeContext;
  final ScrollController scrollController;
  final ValueChanged<AIRateLimit?> onRateLimit;
  final void Function(String sectionType, List<Map<String, dynamic>> items)
      onItemsApplied;

  @override
  ConsumerState<_GenerateTab> createState() => _GenerateTabState();
}

class _GenerateTabState extends ConsumerState<_GenerateTab> {
  bool _busy = false;
  String? _error;
  GenerateSectionResponse? _result;
  String _sectionType = "experience";
  late TextEditingController _input;

  static const _sectionTypes = <(String, String)>[
    ("experience", "خبرة عملية"),
    ("education", "تعليم"),
    ("courses", "دورة"),
    ("projects", "مشروع"),
    ("references", "معرّف"),
    ("hobbies", "هواية"),
    ("skills", "مهارات"),
    ("languages", "لغات"),
    ("links", "روابط"),
    ("address", "عنوان"),
  ];

  @override
  void initState() {
    super.initState();
    _input = TextEditingController();
  }

  @override
  void dispose() {
    _input.dispose();
    super.dispose();
  }

  Future<void> _run() async {
    if (_input.text.trim().isEmpty) {
      setState(() => _error = "صف ما تريد توليده باختصار.");
      return;
    }
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ai = ref.read(aiServiceProvider);
      final response = await ai.generateSection(
        sectionType: _sectionType,
        language: widget.language,
        userInputAr: widget.language == "ar" ? _input.text : null,
        userInputEn: widget.language == "en" ? _input.text : null,
        resumeContext: widget.resumeContext,
      );
      widget.onRateLimit(response.rateLimit);
      setState(() => _result = response.data);
    } on AIException catch (e) {
      setState(
          () => _error = widget.language == "ar" ? e.messageAr : e.messageEn);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      controller: widget.scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        DropdownButtonFormField<String>(
          value: _sectionType,
          items: _sectionTypes
              .map((s) => DropdownMenuItem(value: s.$1, child: Text(s.$2)))
              .toList(growable: false),
          onChanged: (v) => setState(() => _sectionType = v ?? "experience"),
          decoration: const InputDecoration(labelText: "نوع القسم"),
        ),
        const SizedBox(height: 12),
        TextField(
          controller: _input,
          minLines: 3,
          maxLines: 6,
          decoration: const InputDecoration(
            hintText: "مثال: مهندس برمجيات بخبرة 5 سنوات في فِلَتَر",
          ),
        ),
        const SizedBox(height: 12),
        FilledButton.icon(
          onPressed: _busy ? null : _run,
          icon: _busy
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.lightbulb_rounded, size: 18),
          label: const Text("توليد"),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          _ErrorBox(message: _error!),
        ],
        if (_result != null) ...[
          const SizedBox(height: 16),
          if (_result!.explanation.isNotEmpty)
            Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: Text(_result!.explanation,
                  style: TextStyle(
                      color: Theme.of(context).colorScheme.onSurfaceVariant)),
            ),
          ..._result!.items.asMap().entries.map(
                (entry) => Card(
                  margin: const EdgeInsets.only(bottom: 8),
                  child: Padding(
                    padding: const EdgeInsets.all(12),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.stretch,
                      children: [
                        Text(
                          entry.value.entries
                              .map((e) => "${e.key}: ${e.value}")
                              .join("\n"),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
          const SizedBox(height: 8),
          Text(
            "هذه نتيجة للعرض فقط في PR-B. القبول التلقائي في القسم سيُفعَّل في تحديث لاحق.",
            style: TextStyle(
              fontSize: 12,
              color: Theme.of(context).colorScheme.onSurfaceVariant,
            ),
          ),
        ],
      ],
    );
  }
}

// -------- Analyze tab -------------------------------------------------------

class _AnalyzeTab extends ConsumerStatefulWidget {
  const _AnalyzeTab({
    required this.language,
    required this.resumeContext,
    required this.scrollController,
    required this.onRateLimit,
  });

  final String language;
  final Map<String, dynamic> resumeContext;
  final ScrollController scrollController;
  final ValueChanged<AIRateLimit?> onRateLimit;

  @override
  ConsumerState<_AnalyzeTab> createState() => _AnalyzeTabState();
}

class _AnalyzeTabState extends ConsumerState<_AnalyzeTab> {
  bool _busy = false;
  String? _error;
  AnalyzeResumeResponse? _result;

  Future<void> _run() async {
    setState(() {
      _busy = true;
      _error = null;
    });
    try {
      final ai = ref.read(aiServiceProvider);
      final response = await ai.analyzeResume(
        resumeData: widget.resumeContext,
        language: widget.language,
      );
      widget.onRateLimit(response.rateLimit);
      setState(() => _result = response.data);
    } on AIException catch (e) {
      setState(
          () => _error = widget.language == "ar" ? e.messageAr : e.messageEn);
    } finally {
      if (mounted) setState(() => _busy = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return ListView(
      controller: widget.scrollController,
      padding: const EdgeInsets.all(16),
      children: [
        FilledButton.icon(
          onPressed: _busy ? null : _run,
          icon: _busy
              ? const SizedBox(
                  width: 16,
                  height: 16,
                  child: CircularProgressIndicator(strokeWidth: 2))
              : const Icon(Icons.analytics_rounded, size: 18),
          label: const Text("تحليل سيرتي"),
        ),
        if (_error != null) ...[
          const SizedBox(height: 12),
          _ErrorBox(message: _error!),
        ],
        if (_result != null) ...[
          const SizedBox(height: 16),
          Row(
            children: [
              Expanded(
                child: _ScoreTile(
                  label: "النتيجة الكلية",
                  value: _result!.overallScore,
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: _ScoreTile(
                  label: "ATS",
                  value: _result!.atsScore,
                ),
              ),
            ],
          ),
          if (_result!.strengths.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text("نقاط القوة",
                style: TextStyle(fontWeight: FontWeight.bold)),
            ..._result!.strengths.map((s) => _BulletRow(text: s)),
          ],
          if (_result!.improvements.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text("مجالات التحسين",
                style: TextStyle(fontWeight: FontWeight.bold)),
            ..._result!.improvements.map((s) => _BulletRow(text: s)),
          ],
          if (_result!.keywordSuggestions.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text("كلمات مفتاحية مقترحة",
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Wrap(
              spacing: 6,
              runSpacing: 6,
              children: _result!.keywordSuggestions
                  .map((k) => Chip(label: Text(k)))
                  .toList(growable: false),
            ),
          ],
          if (_result!.industryInsights.isNotEmpty) ...[
            const SizedBox(height: 16),
            const Text("نظرة على القطاع",
                style: TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 6),
            Text(_result!.industryInsights),
          ],
        ],
      ],
    );
  }
}

class _ScoreTile extends StatelessWidget {
  const _ScoreTile({required this.label, required this.value});
  final String label;
  final int value;

  @override
  Widget build(BuildContext context) {
    final color = value >= 80
        ? SeerahColors.success
        : value >= 50
            ? SeerahColors.warning
            : SeerahColors.error;
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            Text(label),
            const SizedBox(height: 8),
            Text(
              "$value",
              style: TextStyle(
                fontSize: 32,
                fontWeight: FontWeight.bold,
                color: color,
              ),
            ),
            Text("/100",
                style: TextStyle(
                    color: Theme.of(context).colorScheme.onSurfaceVariant)),
          ],
        ),
      ),
    );
  }
}

class _BulletRow extends StatelessWidget {
  const _BulletRow({required this.text});
  final String text;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Text("• ", style: TextStyle(fontWeight: FontWeight.bold)),
          Expanded(child: Text(text)),
        ],
      ),
    );
  }
}

// -------- Chat tab ----------------------------------------------------------

class _ChatTab extends ConsumerStatefulWidget {
  const _ChatTab({
    required this.language,
    required this.resumeContext,
    required this.scrollController,
  });

  final String language;
  final Map<String, dynamic>? resumeContext;
  final ScrollController scrollController;

  @override
  ConsumerState<_ChatTab> createState() => _ChatTabState();
}

class _ChatTabState extends ConsumerState<_ChatTab> {
  final _messages = <_ChatMessage>[];
  final _input = TextEditingController();
  bool _busy = false;
  StreamSubscription<ChatEvent>? _sub;

  @override
  void dispose() {
    _input.dispose();
    _sub?.cancel();
    super.dispose();
  }

  Future<void> _send() async {
    final text = _input.text.trim();
    if (text.isEmpty || _busy) return;
    setState(() {
      _messages.add(_ChatMessage(role: "user", content: text));
      _messages.add(const _ChatMessage(role: "assistant", content: ""));
      _busy = true;
    });
    _input.clear();
    final ai = ref.read(aiServiceProvider);
    // Build the history excluding the empty assistant placeholder we just
    // appended (the last entry in `_messages`). We previously called
    // `.toList(growable: false)..removeLast()`, but `removeLast()` on a
    // fixed-length list throws `UnsupportedError` — that crashed the chat
    // every time the user sent a message.
    final history = _messages
        .take(_messages.length - 1)
        .where((m) => m.content.isNotEmpty)
        .map((m) => {"role": m.role, "content": m.content})
        .toList(growable: false);
    _sub = ai
        .chatStream(
      messages: history,
      language: widget.language,
      resumeContext: widget.resumeContext,
    )
        .listen(
      (event) {
        if (!mounted) return;
        setState(() {
          if (event.isDelta) {
            final last = _messages.last;
            _messages[_messages.length - 1] = _ChatMessage(
              role: last.role,
              content: last.content + event.text,
            );
          } else if (event.isError) {
            _messages[_messages.length - 1] = _ChatMessage(
              role: "assistant",
              content: "خطأ: ${event.text}",
            );
          }
        });
      },
      onError: (Object err) {
        if (!mounted) return;
        setState(() {
          final msg = err is AIException
              ? (widget.language == "ar" ? err.messageAr : err.messageEn)
              : err.toString();
          _messages[_messages.length - 1] = _ChatMessage(
            role: "assistant",
            content: "خطأ: $msg",
          );
          _busy = false;
        });
      },
      onDone: () {
        if (!mounted) return;
        setState(() => _busy = false);
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        Expanded(
          child: ListView.builder(
            controller: widget.scrollController,
            padding: const EdgeInsets.all(16),
            itemCount: _messages.length,
            itemBuilder: (context, index) {
              final m = _messages[index];
              return Align(
                alignment: m.role == "user"
                    ? AlignmentDirectional.centerEnd
                    : AlignmentDirectional.centerStart,
                child: Container(
                  margin: const EdgeInsets.symmetric(vertical: 4),
                  padding:
                      const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                  constraints: BoxConstraints(
                    maxWidth: MediaQuery.of(context).size.width * 0.75,
                  ),
                  decoration: BoxDecoration(
                    color: m.role == "user"
                        ? SeerahColors.accent.withValues(alpha: 0.12)
                        : Theme.of(context).colorScheme.surfaceContainerHighest,
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Text(m.content.isEmpty ? "..." : m.content),
                ),
              );
            },
          ),
        ),
        SafeArea(
          top: false,
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              children: [
                Expanded(
                  child: TextField(
                    controller: _input,
                    enabled: !_busy,
                    decoration: const InputDecoration(
                      hintText: "اكتب رسالتك...",
                    ),
                    onSubmitted: (_) => _send(),
                  ),
                ),
                const SizedBox(width: 8),
                IconButton.filled(
                  onPressed: _busy ? null : _send,
                  icon: const Icon(Icons.send_rounded),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }
}

class _ChatMessage {
  const _ChatMessage({required this.role, required this.content});
  final String role;
  final String content;
}

// -------- Shared bits -------------------------------------------------------

class _SuggestionCard extends StatelessWidget {
  const _SuggestionCard({
    required this.label,
    required this.text,
    required this.onAccept,
  });
  final String label;
  final String text;
  final VoidCallback onAccept;

  @override
  Widget build(BuildContext context) {
    return Card(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Text(label, style: const TextStyle(fontWeight: FontWeight.bold)),
            const SizedBox(height: 8),
            Text(text),
            const SizedBox(height: 12),
            Align(
              alignment: AlignmentDirectional.centerStart,
              child: FilledButton.tonalIcon(
                onPressed: onAccept,
                icon: const Icon(Icons.check_rounded, size: 18),
                label: const Text("قبول"),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _ErrorBox extends StatelessWidget {
  const _ErrorBox({required this.message});
  final String message;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(12),
      decoration: BoxDecoration(
        color: SeerahColors.error.withValues(alpha: 0.1),
        borderRadius: BorderRadius.circular(8),
        border: Border.all(color: SeerahColors.error.withValues(alpha: 0.3)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          const Icon(Icons.error_outline_rounded,
              color: SeerahColors.error, size: 20),
          const SizedBox(width: 8),
          Expanded(child: Text(message)),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({required this.icon, required this.message});
  final IconData icon;
  final String message;

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            Icon(icon,
                size: 48,
                color: Theme.of(context).colorScheme.onSurfaceVariant),
            const SizedBox(height: 16),
            Text(
              message,
              textAlign: TextAlign.center,
              style: TextStyle(
                  color: Theme.of(context).colorScheme.onSurfaceVariant),
            ),
          ],
        ),
      ),
    );
  }
}
