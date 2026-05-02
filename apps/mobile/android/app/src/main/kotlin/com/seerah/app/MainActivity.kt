package com.seerah.app

// FlutterFragmentActivity (not FlutterActivity) is required by local_auth so
// the biometric prompt can be hosted in the activity stack — without this,
// authenticate() throws "PlatformException(no_fragment_activity, ...)".
import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity: FlutterFragmentActivity()
