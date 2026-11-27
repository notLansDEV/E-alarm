import ExpoModulesCore

public class TimerForegroundServiceModule: Module {
  public func definition() -> ModuleDefinition {
    Name("TimerForegroundService")
    Function("start") { (_: Double) in }
    Function("stop") { }
  }
}
