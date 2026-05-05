package com.seerah.app

// FlutterFragmentActivity (not FlutterActivity) is required by local_auth so
// the biometric prompt can be hosted in the activity stack — without this,
// authenticate() throws "PlatformException(no_fragment_activity, ...)".
import android.os.Bundle
import android.view.WindowManager
import io.flutter.embedding.android.FlutterFragmentActivity

class MainActivity : FlutterFragmentActivity() {
    /**
     * Set [WindowManager.LayoutParams.FLAG_SECURE] before the Flutter view
     * attaches.
     *
     * This:
     *   1. Removes the app's preview from the recents / app-switcher (it
     *      shows a solid app icon instead of the last frame, which would
     *      otherwise leak resume content / Stripe Checkout pages).
     *   2. Blocks system screenshots and screen recording while the app
     *      is foregrounded.
     *
     * Trade-off: screen mirroring (Android Auto, ADB scrcpy) also stops
     * working.  That's an acceptable cost for a CV-builder where every
     * field is PII.  If we ever ship a CarPlay equivalent we'll need to
     * scope this to specific routes instead of the whole window.
     */
    override fun onCreate(savedInstanceState: Bundle?) {
        window.setFlags(
            WindowManager.LayoutParams.FLAG_SECURE,
            WindowManager.LayoutParams.FLAG_SECURE,
        )
        super.onCreate(savedInstanceState)
    }
}
