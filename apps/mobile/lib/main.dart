import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';

void main() {
  runApp(const ProviderScope(child: SeerahApp()));
}

class SeerahApp extends StatelessWidget {
  const SeerahApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Seerah',
      theme: ThemeData(useMaterial3: true),
      home: const Scaffold(
        body: Center(
          child: Text('Seerah — infrastructure tier'),
        ),
      ),
    );
  }
}
