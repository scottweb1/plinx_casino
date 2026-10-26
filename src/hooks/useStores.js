import { useSyncExternalStore } from 'react';
import { walletStore } from '../lib/walletStore.js';
import { settingsStore } from '../lib/settingsStore.js';
import { musicStore } from '../audio/music.js';

export const useWallet = () => useSyncExternalStore(walletStore.subscribe, walletStore.getState);
export const useSettings = () => useSyncExternalStore(settingsStore.subscribe, settingsStore.getState);
export const useMusicAvailable = () => useSyncExternalStore(musicStore.subscribe, musicStore.getState);
