import { useEffect, useMemo, useRef, useState } from 'react';
import Icon from '../components/Icon';
import { api } from '../lib/api';
import {
  THEME_CONTROLS,
  THEME_DEFAULTS,
  THEME_PRESETS,
  applyTheme,
  isHex,
  normalizeHex,
  normalizeTheme,
  resolveTheme,
  storeTheme,
  suggestText,
  themeMatches,
  themeReport,
  themeVars,
} from '../lib/theme';
import { GLASS_INTENSITIES, applyGlass, glassMatches, normalizeGlass } from '../lib/glass';

const pct = (ratio) => `${ratio.toFixed(1)}:1`;

function ContrastChip({ label, grade }) {
  return (
    <span className={`theme-chip theme-chip--${grade.tone}`}>
      <i />
      {label} <strong>{pct(grade.ratio)}</strong> <small>{grade.level}</small>
    </span>
  );
}

function Preview({ theme }) {
  return (
    <div className="theme-preview" style={themeVars(theme)} aria-hidden="true">
      <div className="theme-preview__glow" />
      <div className="theme-preview__bar">
        <span className="theme-preview__mark">YS</span>
        <span className="theme-preview__nav">
          <i /><i /><i />
        </span>
        <span className="theme-preview__pill">Support</span>
      </div>
      <div className="theme-preview__body">
        <span className="theme-preview__eyebrow">New single</span>
        <strong className="theme-preview__title">Accra Nights</strong>
        <p>Afro-fusion from the heart of Accra. Warm guitars, talking drums, 808s.</p>
        <div className="theme-preview__actions">
          <span className="theme-preview__btn">Listen now</span>
          <span className="theme-preview__ghost">Lyrics</span>
        </div>
        <div className="theme-preview__card">
          <span>Support goal</span>
          <strong>GH₵ 41,300 of 60,000</strong>
          <span className="theme-preview__meter"><i /></span>
        </div>
      </div>
    </div>
  );
}

export default function Appearance({ data, refresh, toast }) {
  const resolved = useMemo(() => resolveTheme(data.settings), [data.settings]);
  const saved = resolved.theme;
  const [draft, setDraft] = useState(saved);
  const [typing, setTyping] = useState({});
  const [busy, setBusy] = useState(false);
  const savedGlass = normalizeGlass(data.settings);
  const [glassDraft, setGlassDraft] = useState(savedGlass);
  const [glassBusy, setGlassBusy] = useState(false);
  const savedRef = useRef(saved);
  const savedGlassRef = useRef(savedGlass);
  savedRef.current = saved;
  savedGlassRef.current = savedGlass;

  useEffect(() => {
    setDraft(saved);
    setTyping({});
  }, [saved]);

  useEffect(() => {
    setGlassDraft(normalizeGlass(data.settings));
  }, [data.settings]);

  // Live preview: the studio (and the public site behind it) recolours as you drag.
  useEffect(() => {
    applyTheme(draft);
  }, [draft]);

  useEffect(() => () => applyTheme(savedRef.current), []);

  // Liquid Glass previews live too; leaving the tab without saving restores the
  // published look instead of leaving this browser out of sync.
  useEffect(() => {
    applyGlass(glassDraft);
  }, [glassDraft]);
  useEffect(() => () => applyGlass(savedGlassRef.current), []);

  const glassDirty = !glassMatches(glassDraft, savedGlass);
  const dirty = !themeMatches(draft, saved);
  // True when this browser is showing a palette the API has not stored yet.
  const deviceOnly = resolved.source === 'device' && !themeMatches(saved, data.settings.theme);
  const report = themeReport(draft);
  const activePreset = THEME_PRESETS.find((preset) => themeMatches(preset.theme, draft))?.id;

  const update = (key, value) => setDraft((current) => ({ ...current, [key]: value }));

  const doneTyping = (key) => () =>
    setTyping((current) => {
      const next = { ...current };
      delete next[key];
      return next;
    });

  const pick = (key) => (event) => {
    doneTyping(key)();
    update(key, normalizeHex(event.target.value, draft[key]));
  };

  const typeHex = (key) => (event) => {
    const raw = event.target.value;
    setTyping((current) => ({ ...current, [key]: raw }));
    if (isHex(raw)) update(key, normalizeHex(raw));
  };

  const save = async (event) => {
    event?.preventDefault?.();
    setBusy(true);
    const palette = normalizeTheme(draft);
    try {
      const response = await api.saveSettings({ theme: palette });
      const stored = response?.settings?.theme;
      const accepted = Boolean(stored) && typeof stored === 'object' && themeMatches(stored, palette);
      // Keep a device copy either way, so a reload never loses the palette while
      // an older API (or a redeploy that reset the JSON file) catches up.
storeTheme(palette, accepted ? response.settings.themeUpdatedAt || undefined : undefined);
      if (accepted) {
        toast('Colours saved — the public site is updated');
      } else {
        toast('Colours saved on this device, but the live API did not store them. Publish them by deploying the latest backend.', 'error');
      }
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  const saveGlass = async () => {
    setGlassBusy(true);
    try {
      await api.saveSettings({
        liquidGlass: glassDraft.liquidGlass,
        glassIntensity: glassDraft.glassIntensity,
      });
      applyGlass(glassDraft);
      toast(glassDraft.liquidGlass ? 'Liquid Glass published for every visitor' : 'Liquid Glass turned off');
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setGlassBusy(false);
    }
  };

  return (
    <form className="appearance" onSubmit={save}>
      <div className="studio__top">
        <div>
          <h1>Appearance</h1>
          <p>Colour control for the public site. Everything previews live — save to publish it.</p>
        </div>
        <div className="appearance__actions">
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDraft(saved)} disabled={!dirty || busy}>
            <Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} />
            Revert
          </button>
          <button type="button" className="btn btn--ghost btn--sm" onClick={() => setDraft({ ...THEME_DEFAULTS })} disabled={busy}>
            Reset default
          </button>
          <button className="btn btn--gold btn--sm" disabled={!dirty || busy}>
            <Icon name="check" size={15} />
            {busy ? 'Saving…' : 'Save colours'}
          </button>
        </div>
      </div>

      <div className="appearance__grid">
        <div className="appearance__col">
          <section className="panel">
            <div className="panel__head">
              <div>
                <h3>Presets</h3>
                <p>One tap to restyle the whole site, then fine-tune below.</p>
              </div>
            </div>
            <div className="theme-presets">
              {THEME_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  className={`theme-preset ${activePreset === preset.id ? 'is-active' : ''}`}
                  onClick={() => setDraft(normalizeTheme(preset.theme))}
                  aria-pressed={activePreset === preset.id}
                >
                  <span
                    className="theme-preset__swatch"
                    style={{ background: `linear-gradient(135deg, ${preset.theme.accent}, ${preset.theme.glow})` }}
                  />
                  <span className="theme-preset__copy">
                    <strong>{preset.name}</strong>
                    <small>{preset.note}</small>
                  </span>
                  {activePreset === preset.id ? <Icon name="check" size={14} /> : null}
                </button>
              ))}
            </div>
          </section>

          <section className="panel glass-panel">
            <div className="panel__head">
              <div>
                <h3>Liquid Glass</h3>
                <p>Refractive, translucent surfaces with soft caustics and specular edges. Applies to the whole site.</p>
              </div>
              <span className="badge-status badge-status--live">Site-wide</span>
            </div>
            <div className="toggle-row">
              <div>
                <strong>Enable Liquid Glass</strong>
                <small>Turn off to return to the flat V12 surfaces.</small>
              </div>
              <button
                type="button"
                className={`switch ${glassDraft.liquidGlass ? 'is-on' : ''}`}
                onClick={() => setGlassDraft((current) => ({ ...current, liquidGlass: !current.liquidGlass }))}
                aria-label="Toggle Liquid Glass"
                aria-pressed={glassDraft.liquidGlass}
              />
            </div>
            <span className="field__hint" style={{ display: 'block', margin: '18px 0 10px' }}>Intensity</span>
            <div className="glass-intensities">
              {GLASS_INTENSITIES.map((option) => (
                <button
                  key={option.id}
                  type="button"
                  className={`glass-intensity ${glassDraft.glassIntensity === option.id ? 'is-active' : ''}`}
                  onClick={() => setGlassDraft((current) => ({ ...current, liquidGlass: true, glassIntensity: option.id }))}
                  aria-pressed={glassDraft.glassIntensity === option.id && glassDraft.liquidGlass}
                  disabled={!glassDraft.liquidGlass}
                >
                  <Icon name="droplet" size={16} />
                  <strong>{option.name}</strong>
                  <small>{option.note}</small>
                </button>
              ))}
            </div>
            <div className="glass-savebar">
              <span>{glassDirty ? 'Unsaved glass changes — previewing on this device.' : 'Glass matches the live site.'}</span>
              <button type="button" className="btn btn--gold btn--sm" onClick={saveGlass} disabled={!glassDirty || glassBusy}>
                <Icon name="check" size={15} /> {glassBusy ? 'Saving…' : 'Save liquid glass'}
              </button>
            </div>
          </section>

          <section className="panel">
            <div className="panel__head">
              <div>
                <h3>Colours</h3>
                <p>Pick a swatch or paste a hex code. Soft and deep shades are mixed for you.</p>
              </div>
            </div>

            <div className="theme-fields">
              {THEME_CONTROLS.map((control) => (
                <div className="theme-field" key={control.key}>
                  <label className="theme-field__swatch" htmlFor={`theme-${control.key}`}>
                    <span style={{ background: draft[control.key] }} />
                    <input
                      id={`theme-${control.key}`}
                      type="color"
                      value={draft[control.key]}
                      onChange={pick(control.key)}
                      aria-label={`${control.label} colour`}
                    />
                  </label>
                  <div className="theme-field__copy">
                    <strong>{control.label}</strong>
                    <small>{control.hint}</small>
                  </div>
                  <input
                    className="theme-field__hex"
                    value={typing[control.key] ?? draft[control.key]}
                    onChange={typeHex(control.key)}
                    onBlur={doneTyping(control.key)}
                    spellCheck={false}
                    autoComplete="off"
                    aria-label={`${control.label} hex value`}
                  />
                </div>
              ))}
            </div>

            <div className="theme-chips">
              <ContrastChip label="Body text" grade={report.body} />
              <ContrastChip label="Accent" grade={report.accent} />
              <ContrastChip label="Button label" grade={report.label} />
            </div>

            <div className="theme-hints">
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => update('text', suggestText(draft.background))}
              >
                <Icon name="bolt" size={14} />
                Fix text contrast
              </button>
              <button
                type="button"
                className="btn btn--ghost btn--sm"
                onClick={() => update('surface', draft.background)}
              >
                <Icon name="grid" size={14} />
                Match surface to background
              </button>
            </div>

            {deviceOnly ? (
              <div className="alert alert--info theme-device-note">
                <Icon name="bolt" size={16} />
                <span>
                  These colours are saved on this device only. The API in front of the studio is not storing themes
                  yet — deploy the latest backend (or give it a persistent <code>DATA_DIR</code>) and save again to
                  publish them to every visitor.
                </span>
              </div>
            ) : null}
          </section>
        </div>

        <div className="appearance__col appearance__col--preview">
          <section className="panel panel--preview">
            <div className="panel__head">
              <div>
                <h3>Live preview</h3>
                <p>How the public site reads with these colours.</p>
              </div>
              {dirty ? <span className="theme-unsaved">Unsaved</span> : null}
            </div>
            <Preview theme={draft} />
            <div className="theme-swatches">
              {THEME_CONTROLS.map((control) => (
                <span key={control.key} title={`${control.label} ${draft[control.key]}`}>
                  <i style={{ background: draft[control.key] }} />
                  {draft[control.key]}
                </span>
              ))}
            </div>
            <p className="field__hint" style={{ marginTop: 10 }}>
              Saved colours apply to every page — header, player, support panel and studio — for everyone who visits.
            </p>
          </section>
        </div>
      </div>

      <div className={`appearance__savebar ${deviceOnly ? 'is-device' : ''}`}>
        <span>
          {dirty
            ? 'You have unsaved colour changes.'
            : deviceOnly
              ? 'Saved on this device — deploy the latest backend to publish it to every visitor.'
              : 'Colours match the live site.'}
        </span>
        <button className="btn btn--gold btn--sm" disabled={!dirty || busy}>
          <Icon name="check" size={15} />
          {busy ? 'Saving…' : 'Save colours'}
        </button>
      </div>
    </form>
  );
}
