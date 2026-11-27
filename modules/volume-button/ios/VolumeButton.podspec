Pod::Spec.new do |s|
  s.name           = 'VolumeButton'
  s.version        = '1.0.0'
  s.summary        = 'Volume button events'
  s.description    = 'Detects volume button presses for alarm actions'
  s.author         = ''
  s.homepage       = 'https://docs.expo.dev/modules/'
  s.platforms      = { :ios => '15.1' }
  s.source         = { git: '' }
  s.static_framework = true

  s.dependency 'ExpoModulesCore'

  s.source_files = "**/*.{h,m,mm,swift,hpp,cpp}"
end
