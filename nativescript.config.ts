import { NativeScriptConfig } from '@nativescript/core';

export default {
  id: 'com.unplug.screentime',
  appPath: 'app',
  appResourcesPath: 'App_Resources',
  android: {
    v8Flags: '--expose_gc',
    markingMode: 'none'
  },
  ios: {
    discardUncaughtJsExceptions: true,
    codeCache: true
  },
  appDisplayName: 'Unplug',
  main: 'app/app.ts',
  cli: {
    packageManager: 'npm'
  },
  hooks: [
    {
      type: 'before-prepare',
      script: 'hooks/before-prepare/nativescript-dev-webpack.js'
    }
  ]
} as NativeScriptConfig;