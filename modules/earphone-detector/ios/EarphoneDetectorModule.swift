import AVFoundation
import ExpoModulesCore

public class EarphoneDetectorModule: Module {
  public func definition() -> ModuleDefinition {
    Name("EarphoneDetector")

    Events("onChange")

    Function("getStatus") { () -> [String: Any] in
      return Self.currentStatus()
    }

    OnStartObserving {
      NotificationCenter.default.addObserver(
        self,
        selector: #selector(self.handleRouteChange),
        name: AVAudioSession.routeChangeNotification,
        object: nil
      )
    }

    OnStopObserving {
      NotificationCenter.default.removeObserver(
        self,
        name: AVAudioSession.routeChangeNotification,
        object: nil
      )
    }
  }

  @objc private func handleRouteChange(_ notification: Notification) {
    sendEvent("onChange", Self.currentStatus())
  }

  private static func currentStatus() -> [String: Any] {
    let session = AVAudioSession.sharedInstance()
    let outputs = session.currentRoute.outputs

    let hasWired = outputs.contains { port in
      port.portType == .headphones || port.portType == .headsetMic
    }
    let hasBluetooth = outputs.contains { port in
      port.portType == .bluetoothA2DP ||
      port.portType == .bluetoothHFP ||
      port.portType == .bluetoothLE
    }

    if hasWired {
      return ["connected": true, "routeType": "wired"]
    }
    if hasBluetooth {
      return ["connected": true, "routeType": "bluetooth"]
    }
    return ["connected": false, "routeType": "none"]
  }
}
