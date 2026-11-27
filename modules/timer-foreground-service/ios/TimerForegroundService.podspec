Pod::Spec.new do |s|
  s.name           = 'TimerForegroundService'
  s.version        = '1.0.0'
  s.summary        = 'Timer foreground service'
  s.description    = 'Runs a foreground service for timer countdown'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true
  s.dependency 'ExpoModulesCore'
  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
