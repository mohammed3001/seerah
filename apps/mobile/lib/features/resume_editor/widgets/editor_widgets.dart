// =============================================================================
// editor_widgets.dart
// Shared form primitives for the editor screen. Mirrors the look-and-feel of
// the web app's editor — labeled fields with right-aligned text, AI button
// next to the section header (per-field AI), inline validation hints.
// =============================================================================

import "package:flutter/material.dart";

import "../../../core/theme/colors.dart";

/// Single-line text field with optional AI button overlay.
class EditorTextField extends StatelessWidget {
  const EditorTextField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.maxLength,
    this.keyboardType,
    this.textDirection,
    this.hintText,
    this.onAiTap,
    this.icon,
    this.errorText,
  });

  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final int? maxLength;
  final TextInputType? keyboardType;
  final TextDirection? textDirection;
  final String? hintText;
  final VoidCallback? onAiTap;
  final IconData? icon;
  final String? errorText;

  @override
  Widget build(BuildContext context) {
    return _LabeledField(
      label: label,
      onAiTap: onAiTap,
      child: TextFormField(
        initialValue: value,
        onChanged: onChanged,
        maxLength: maxLength,
        keyboardType: keyboardType,
        textDirection: textDirection,
        decoration: InputDecoration(
          hintText: hintText,
          prefixIcon: icon == null ? null : Icon(icon, size: 20),
          counterText: maxLength == null ? null : "",
          errorText: errorText,
        ),
      ),
    );
  }
}

/// Multi-line textarea with character counter + AI button.
class EditorTextArea extends StatelessWidget {
  const EditorTextArea({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.maxLength = 3000,
    this.minLines = 4,
    this.maxLines = 10,
    this.hintText,
    this.onAiTap,
  });

  final String label;
  final String value;
  final ValueChanged<String> onChanged;
  final int maxLength;
  final int minLines;
  final int maxLines;
  final String? hintText;
  final VoidCallback? onAiTap;

  @override
  Widget build(BuildContext context) {
    return _LabeledField(
      label: label,
      onAiTap: onAiTap,
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.stretch,
        children: [
          TextFormField(
            initialValue: value,
            onChanged: onChanged,
            minLines: minLines,
            maxLines: maxLines,
            maxLength: maxLength,
            decoration: InputDecoration(
              hintText: hintText,
              counterText: "",
              alignLabelWithHint: true,
            ),
          ),
          const SizedBox(height: 4),
          Align(
            alignment: AlignmentDirectional.centerStart,
            child: Text(
              "${value.length}/$maxLength",
              style: TextStyle(
                fontSize: 11,
                color: Theme.of(context).colorScheme.onSurfaceVariant,
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class EditorDropdownField<T> extends StatelessWidget {
  const EditorDropdownField({
    super.key,
    required this.label,
    required this.value,
    required this.items,
    required this.onChanged,
    this.icon,
  });

  final String label;
  final T? value;
  final List<DropdownMenuItem<T>> items;
  final ValueChanged<T?> onChanged;
  final IconData? icon;

  @override
  Widget build(BuildContext context) {
    return _LabeledField(
      label: label,
      child: DropdownButtonFormField<T>(
        value: value,
        items: items,
        onChanged: onChanged,
        decoration: InputDecoration(
          prefixIcon: icon == null ? null : Icon(icon, size: 20),
        ),
      ),
    );
  }
}

class EditorDatePickerField extends StatelessWidget {
  const EditorDatePickerField({
    super.key,
    required this.label,
    required this.value,
    required this.onChanged,
    this.firstDate,
    this.lastDate,
    this.allowClear = true,
  });

  final String label;
  final DateTime? value;
  final ValueChanged<DateTime?> onChanged;
  final DateTime? firstDate;
  final DateTime? lastDate;
  final bool allowClear;

  @override
  Widget build(BuildContext context) {
    return _LabeledField(
      label: label,
      child: InkWell(
        borderRadius: BorderRadius.circular(12),
        onTap: () async {
          final picked = await showDatePicker(
            context: context,
            initialDate: value ?? DateTime.now(),
            firstDate: firstDate ?? DateTime(1950),
            lastDate: lastDate ?? DateTime(2100),
          );
          if (picked != null) onChanged(picked);
        },
        child: InputDecorator(
          decoration: InputDecoration(
            prefixIcon: const Icon(Icons.calendar_today_rounded, size: 18),
            suffixIcon: allowClear && value != null
                ? IconButton(
                    icon: const Icon(Icons.close, size: 18),
                    onPressed: () => onChanged(null),
                  )
                : null,
          ),
          child: Text(
            value == null
                ? "اختر التاريخ"
                : "${value!.year}/${value!.month.toString().padLeft(2, '0')}/${value!.day.toString().padLeft(2, '0')}",
          ),
        ),
      ),
    );
  }
}

class VisibilityToggle extends StatelessWidget {
  const VisibilityToggle({
    super.key,
    required this.value,
    required this.onChanged,
  });

  final bool value;
  final ValueChanged<bool> onChanged;

  @override
  Widget build(BuildContext context) {
    return Tooltip(
      message: value ? "ظاهر في السيرة" : "مخفي في السيرة",
      child: IconButton(
        icon: Icon(
          value ? Icons.visibility_rounded : Icons.visibility_off_rounded,
          size: 20,
          color: value
              ? SeerahColors.accent
              : Theme.of(context).colorScheme.onSurfaceVariant,
        ),
        onPressed: () => onChanged(!value),
      ),
    );
  }
}

class _LabeledField extends StatelessWidget {
  const _LabeledField({
    required this.label,
    required this.child,
    this.onAiTap,
  });

  final String label;
  final Widget child;
  final VoidCallback? onAiTap;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: [
        Padding(
          padding: const EdgeInsetsDirectional.only(bottom: 6),
          child: Row(
            children: [
              Expanded(
                child: Text(
                  label,
                  style: Theme.of(context).textTheme.labelMedium,
                ),
              ),
              if (onAiTap != null) _AiButton(onPressed: onAiTap!),
            ],
          ),
        ),
        child,
      ],
    );
  }
}

class _AiButton extends StatelessWidget {
  const _AiButton({required this.onPressed});
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        padding: const EdgeInsets.symmetric(horizontal: 8),
        minimumSize: const Size(0, 28),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        foregroundColor: SeerahColors.accent,
      ),
      icon: const Icon(Icons.auto_awesome_rounded, size: 16),
      label: const Text("AI", style: TextStyle(fontSize: 12)),
    );
  }
}

/// Section card. Pads + provides a header row with title + actions slot.
class SectionCard extends StatelessWidget {
  const SectionCard({
    super.key,
    required this.title,
    required this.children,
    this.action,
  });

  final String title;
  final List<Widget> children;
  final Widget? action;

  @override
  Widget build(BuildContext context) {
    return Card(
      margin: const EdgeInsets.symmetric(vertical: 6),
      clipBehavior: Clip.antiAlias,
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            Row(
              children: [
                Expanded(
                  child: Text(
                    title,
                    style: Theme.of(context).textTheme.titleMedium,
                  ),
                ),
                if (action != null) action!,
              ],
            ),
            const SizedBox(height: 12),
            ...children,
          ],
        ),
      ),
    );
  }
}

class AddRowButton extends StatelessWidget {
  const AddRowButton({
    super.key,
    required this.label,
    required this.onPressed,
    this.busy = false,
  });

  final String label;
  final VoidCallback onPressed;
  final bool busy;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(top: 8),
      child: OutlinedButton.icon(
        onPressed: busy ? null : onPressed,
        icon: busy
            ? const SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(strokeWidth: 2),
              )
            : const Icon(Icons.add_rounded, size: 18),
        label: Text(label),
      ),
    );
  }
}

class DeleteRowButton extends StatelessWidget {
  const DeleteRowButton({super.key, required this.onPressed});
  final VoidCallback onPressed;

  @override
  Widget build(BuildContext context) {
    return TextButton.icon(
      onPressed: onPressed,
      style: TextButton.styleFrom(
        foregroundColor: SeerahColors.error,
      ),
      icon: const Icon(Icons.delete_outline_rounded, size: 18),
      label: const Text("حذف"),
    );
  }
}
