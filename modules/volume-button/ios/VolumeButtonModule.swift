import ExpoModulesCore

public class VolumeButtonModule: Module {
  public func definition() -> ModuleDefinition {
    Name("VolumeButton")
    Events("onVolumeButton")
    Function("setEnabled") { (_: Bool) in
      // iOS does not allow reliable hardware volume button interception.
    }
  }
}
