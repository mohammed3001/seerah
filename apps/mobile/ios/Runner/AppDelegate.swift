import Flutter
import UIKit

// -----------------------------------------------------------------------------
// iOS counterpart to Android's `FLAG_SECURE` (set in MainActivity.kt).
//
// iOS has no equivalent flag.  The standard approach is to overlay a blank
// view when the app is about to leave the foreground (so the system's
// snapshot — used for the App Switcher thumbnail and animated transitions —
// captures the overlay, not the user's resume content), and remove it when
// the app comes back.
//
// Edit history:
//   - Audit M1b adds the overlay below to hide PII (name / phone / address)
//     from the App Switcher and screen-record overlays.
// -----------------------------------------------------------------------------
@main
@objc class AppDelegate: FlutterAppDelegate {
  /// View installed on top of the key window while the app is leaving the
  /// foreground.  Keeping a single instance lets us add it on resign and
  /// remove it on become-active without leaking views.
  private var privacyOverlay: UIView?

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    GeneratedPluginRegistrant.register(with: self)
    return super.application(application, didFinishLaunchingWithOptions: launchOptions)
  }

  override func applicationWillResignActive(_ application: UIApplication) {
    super.applicationWillResignActive(application)
    addPrivacyOverlay()
  }

  override func applicationDidBecomeActive(_ application: UIApplication) {
    super.applicationDidBecomeActive(application)
    removePrivacyOverlay()
  }

  private func addPrivacyOverlay() {
    guard privacyOverlay == nil, let window = self.window else { return }
    let overlay = UIView(frame: window.bounds)
    // Match the splash/launch background so the transition feels intentional
    // rather than glitchy.  Using systemBackground keeps it sensible in both
    // light and dark mode.
    overlay.backgroundColor = .systemBackground
    overlay.autoresizingMask = [.flexibleWidth, .flexibleHeight]
    window.addSubview(overlay)
    privacyOverlay = overlay
  }

  private func removePrivacyOverlay() {
    privacyOverlay?.removeFromSuperview()
    privacyOverlay = nil
  }
}
