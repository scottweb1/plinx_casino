import { settingsStore } from '../lib/settingsStore.js';
import { initAudio } from '../audio/engine.js';
import { useSettings, useMusicAvailable } from '../hooks/useStores.js';

export default function SoundControls() {
  const s = useSettings();
  const musicAvail = useMusicAvailable();
  return (
    <div className="snd" role="group" aria-label="Sound">
      <button aria-pressed={s.sound} onClick={() => { initAudio(); settingsStore.set({ sound: !s.sound }); }}>
        {s.sound ? 'Sound on' : 'Sound off'}
      </button>
      <input
        type="range" min="0" max="1" step="0.05" value={s.volume} aria-label="Volume"
        disabled={!s.sound}
        onChange={(e) => { initAudio(); settingsStore.set({ volume: +e.target.value }); }}
      />
      {musicAvail && (
        <button aria-pressed={s.music} onClick={() => { initAudio(); settingsStore.set({ music: !s.music }); }}>
          {s.music ? 'Music on' : 'Music off'}
        </button>
      )}
    </div>
  );
}
