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
  themePublished,
  themeReport,
  themeVars,
} from '../lib/theme';
import {
  VISUAL_STYLE_CHOICES,
  applyVisualStyle,
  normalizeVisualStyle,
  resolveVisualStyle,
  storeVisualStyle,
} from '../lib/visualStyle';
import {
  DEFAULT_FONT_SCALE,
  FONT_SCALE_CHOICES,
  FONT_SCALE_MAX,
  FONT_SCALE_MIN,
  FONT_SCALE_STEP,
  applyFontScale,
  normalizeFontScale,
  resolveFontScale,
  storeFontScale,
} from '../lib/typography';

const pct = (ratio) => `${ratio.toFixed(1)}:1`;

function ContrastChip({ label, grade }) {
  return (
    <span className={`theme-chip theme-chip--${grade.tone}`}>
      <i />
      {label} <strong>{pct(grade.ratio)}</strong> <small>{grade.level}</small>
    </span>
  );
}

function Preview({ theme, style }) {
  return (
    <div
      className={`theme-preview ${style === 'liquid' ? 'theme-preview--liquid' : ''}`}
      style={themeVars(theme)}
      aria-hidden="true"
    >
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
  const resolvedStyle = useMemo(() => resolveVisualStyle(data.settings), [data.settings]);
  const resolvedFont = useMemo(() => resolveFontScale(data.settings), [data.settings]);
  const saved = resolved.theme;
  const savedStyle = normalizeVisualStyle(resolvedStyle.style);
  const savedFontScale = normalizeFontScale(resolvedFont.scale);
  const [draft, setDraft] = useState(saved);
  const [style, setStyle] = useState(savedStyle);
  const [fontScale, setFontScale] = useState(savedFontScale);
  const [typing, setTyping] = useState({});
  const [busy, setBusy] = useState(false);
  const savedRef = useRef(saved);
  const savedStyleRef = useRef(savedStyle);
  const savedFontScaleRef = useRef(savedFontScale);
  savedRef.current = saved;
  savedStyleRef.current = savedStyle;
  savedFontScaleRef.current = savedFontScale;

  useEffect(() => {
    setDraft(saved);
    setTyping({});
  }, [saved]);

  useEffect(() => {
    setStyle(savedStyle);
  }, [savedStyle]);

  useEffect(() => {
    setFontScale(savedFontScale);
  }, [savedFontScale]);

  // Live preview: the studio (and the public site behind it) recolours as you drag.
  useEffect(() => {
    applyTheme(draft);
  }, [draft]);

  useEffect(() => {
    applyVisualStyle(style);
  }, [style]);

  useEffect(() => {
    applyFontScale(fontScale);
  }, [fontScale]);

  useEffect(
    () => () => {
      applyTheme(savedRef.current);
      applyVisualStyle(savedStyleRef.current);
      applyFontScale(savedFontScaleRef.current);
    },
    []
  );

  const dirty = !themeMatches(draft, saved) || style !== savedStyle || fontScale !== savedFontScale;
  // True when this browser is showing a palette the API has not stored yet.
  const deviceOnly = resolved.source === 'device' && !themeMatches(saved, data.settings.theme);
  // The current backend advertises its build and storage in /api/site and
  // /api/admin/overview. Older builds omit it entirely — that is the clue that
  // a redeploy is needed rather than another save.
  const apiIsCurrent = data?.capabilities?.themeStorage === true;
  const apiDiagnosis = !apiIsCurrent
    ? 'The API in front of the studio is running an older build that cannot store themes.'
    : data.capabilities.dataDirConfigured === false
      ? 'The API has no persistent DATA_DIR, so a restart or redeploy wipes the saved palette.'
      : 'The API did not keep the last colour save, so only this device knows the palette.';
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
      const response = await api.saveSettings({ theme: palette, visualStyle: style, fontScale });
      // The PATCH echo is not proof of publication: an older API answers 200
      // while silently dropping `theme`. Check what an anonymous visitor gets.
      let publicSite = null;
      let checkFailed = false;
      try {
        publicSite = await api.siteFresh();
      } catch {
        checkFailed = true;
      }
      const settings = (checkFailed ? response : publicSite)?.settings;
      const themeAccepted = themePublished(checkFailed ? response : publicSite, palette);
      const styleAccepted = settings?.visualStyle === style;
      const fontAccepted = settings?.fontScale === fontScale;
      const allAccepted = themeAccepted && styleAccepted && fontAccepted;
      // Keep device copies either way, so a reload never loses the owner's choices
      // while an older API (or a redeploy with a reset JSON file) catches up.
      storeTheme(palette, themeAccepted ? response?.settings?.themeUpdatedAt || settings?.themeUpdatedAt || undefined : undefined);
      storeVisualStyle(style, styleAccepted ? response?.settings?.styleUpdatedAt || settings?.styleUpdatedAt || undefined : undefined);
      storeFontScale(fontScale, fontAccepted ? response?.settings?.fontScaleUpdatedAt || settings?.fontScaleUpdatedAt || undefined : undefined);
      if (allAccepted) {
        toast('Appearance published — every visitor now sees these colours, finish and font size');
      } else {
        toast('Saved on this device only. Deploy the latest backend with a persistent DATA_DIR, then press Publish colours.', 'error');
      }
      await refresh();
    } catch (err) {
      toast(err.message, 'error');
    } finally {
      setBusy(false);
    }
  };

  return (
    <form className="appearance" onSubmit={save}>
      <div className="studio__top">
        <div>
          <h1>Appearance</h1>
          <p>Choose the Liquid Glass finish, font size and colour palette for the public site. Everything previews live.</p>
        </div>
        <div className="appearance__actions">
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setDraft(saved);
              setStyle(savedStyle);
              setFontScale(savedFontScale);
            }}
            disabled={!dirty || busy}
          >
            <Icon name="arrow" size={14} style={{ transform: 'rotate(180deg)' }} />
            Revert
          </button>
          <button
            type="button"
            className="btn btn--ghost btn--sm"
            onClick={() => {
              setDraft({ ...THEME_DEFAULTS });
              setStyle('liquid');
              setFontScale(DEFAULT_FONT_SCALE);
            }}
            disabled={busy}
          >
            Reset default
          </button>
          <button className="btn btn--gold btn--sm" disabled={(!dirty && !deviceOnly) || busy}>
            <Icon name="check" size={15} />
            {busy ? 'Saving…' : deviceOnly && !dirty ? 'Publish colours' : 'Save appearance'}
          </button>
        </div>
      </div>

      <div className="appearance__grid">
        <div className="appearance__col">
          <section className="panel visual-style-panel">
            <div className="panel__head">
              <div>
                <h3>Visual finish</h3>
                <p>Choose how light, blur and colour move through every surface.</p>
              </div>
              {style === 'liquid' ? <span className="badge-status badge-status--live">Liquid Glass</span> : null}
            </div>
            <div className="visual-style-grid">
              {VISUAL_STYLE_CHOICES.map((choice) => (
                <button
                  key={choice.id}
                  type="button"
                  className={`visual-style-card ${style === choice.id ? 'is-active' : ''}`}
                  onClick={() => setStyle(choice.id)}
                  aria-pressed={style === choice.id}
                >
                  <span className={`visual-style-card__swatch visual-style-card__swatch--${choice.id}`} aria-hidden="true">
                    <i /><i /><i />
                  </span>
                  <span className="visual-style-card__copy">
                    <strong>{choice.name}</strong>
                    <small>{choice.note}</small>
                  </span>
                  {style === choice.id ? <Icon name="check" size={15} /> : null}
                </button>
              ))}
            </div>
          </section>

          <section className="panel font-scale-panel">
            <div className="panel__head">
              <div>
                <h3>Font size</h3>
                <p>Scale every heading, label and paragraph across the public site.</p>
              </div>
              <span className="font-scale-badge">{fontScale}%</span>
            </div>
            <div className="font-scale-control">
              <label htmlFor="font-scale-range">Type scale</label>
              <input
                id="font-scale-range"
                type="range"
                min={FONT_SCALE_MIN}
                max={FONT_SCALE_MAX}
                step={FONT_SCALE_STEP}
                value={fontScale}
                onChange={(event) => setFontScale(Number(event.target.value))}
                aria-valuetext={`${fontScale} percent`}
              />
              <div className="font-scale-range-labels">
                <span>{FONT_SCALE_MIN}%</span>
                <span>{DEFAULT_FONT_SCALE}%</span>
                <span>{FONT_SCALE_MAX}%</span>
              </div>
            </div>
            <div className="font-scale-presets">
              {FONT_SCALE_CHOICES.map((choice) => (
                <button
                  key={choice.value}
                  type="button"
                  className={fontScale === choice.value ? 'is-active' : ''}
                  onClick={() => setFontScale(choice.value)}
                  aria-pressed={fontScale === choice.value}
                  title={choice.note}
                >
                  <strong>{choice.label}</strong>
                  <small>{choice.value}%</small>
                </button>
              ))}
            </div>
            <div className="font-scale-preview" aria-label={`Font size preview at ${fontScale}%`}>
              <span className="eyebrow eyebrow--plain">Live type preview</span>
              <strong>Accra Nights</strong>
              <p>Afro-fusion from the heart of Accra. Warm guitars, talking drums, 808s.</p>
            </div>
          </section>

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
                  <strong>These colours are saved on this device only.</strong> {apiDiagnosis} Deploy the latest
                  backend with a persistent <code>DATA_DIR</code>, then press{' '}
                  <strong>Publish colours</strong> to send this palette to every visitor.
                </span>
                <button type="button" className="btn btn--gold btn--sm" onClick={save} disabled={busy}>
                  <Icon name="check" size={14} />
                  {busy ? 'Publishing…' : 'Publish colours'}
                </button>
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
            <Preview theme={draft} style={style} />
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
            {data?.capabilities ? (
              <p className="field__hint" style={{ marginTop: 6 }}>
                API build {data.capabilities.version} · theme storage{' '}
                {data.capabilities.themeStorage ? 'on' : 'unavailable'} · DATA_DIR{' '}
                {data.capabilities.dataDirConfigured ? 'on a persistent volume' : 'not configured'}.
              </p>
            ) : null}
          </section>
        </div>
      </div>

      <div className={`appearance__savebar ${deviceOnly ? 'is-device' : ''}`}>
        <span>
          {dirty
            ? 'You have unsaved appearance changes.'
            : deviceOnly
              ? 'Saved on this device — deploy the latest backend with a persistent DATA_DIR, then publish.'
              : 'The live site matches this appearance.'}
        </span>
        <button className="btn btn--gold btn--sm" disabled={(!dirty && !deviceOnly) || busy}>
          <Icon name="check" size={15} />
          {busy ? 'Saving…' : deviceOnly && !dirty ? 'Publish colours' : 'Save appearance'}
        </button>
      </div>
    </form>
  );
}
