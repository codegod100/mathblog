// Reusable AT Protocol auth component for Obsidian plugins.
//
// Usage:
//   import { AtpAuthManager, AuthSettingsSection } from './auth';
//
//   const auth = new AtpAuthManager({
//     plugin: this,
//     protocolScheme: 'myplugin-oauth',
//     clientId: 'https://.../client-metadata.json',
//     redirectUri: 'https://.../oauth-callback.html',
//     scope: 'atproto transition:generic',
//   });
//   await auth.initialize();

export { AtpAuthManager } from './auth-manager';
export { AuthSettingsSection } from './settings';
export type { AtpAuthOptions, IAtpAuthManager } from './types';
