// Mesures executees dans la page. Un element « hors ecran » n'est compte que
// s'il n'est pas contenu dans un conteneur qui le fait defiler ou le coupe
// volontairement (tableau en scroll horizontal controle, bandeau d'onglets...).
export const MEASURE = String.raw`(() => {
  const vw = document.documentElement.clientWidth;
  const vh = innerHeight;
  const describe = (el) => {
    const cls = typeof el.className === 'string' ? el.className.trim().split(/\s+/).slice(0, 3).join('.') : '';
    const label = (el.getAttribute('aria-label') || el.textContent || el.getAttribute('placeholder') || '').trim().replace(/\s+/g, ' ').slice(0, 50);
    return el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') + (cls ? '.' + cls : '') + (label ? ' "' + label + '"' : '');
  };
  const hidden = (el) => {
    if (el.closest('[inert],[aria-hidden="true"]')) return true;
    const s = getComputedStyle(el);
    if (s.visibility === 'hidden' || s.display === 'none' || Number(s.opacity) === 0) return true;
    const r = el.getBoundingClientRect();
    return r.width === 0 || r.height === 0;
  };
  const contained = (el) => {
    for (let p = el.parentElement; p && p !== document.documentElement; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll|hidden|clip)/.test(s.overflowX)) {
        const r = p.getBoundingClientRect();
        if (r.left >= -1 && r.right <= vw + 1) return true;
      }
    }
    return false;
  };
  const all = [...document.body.querySelectorAll('*')];
  const offenders = [];
  for (const el of all) {
    if (hidden(el)) continue;
    const r = el.getBoundingClientRect();
    if ((r.right > vw + 1 || r.left < -1) && !contained(el)) {
      const parent = el.parentElement;
      const pr = parent?.getBoundingClientRect();
      if (parent && pr && (pr.right > vw + 1 || pr.left < -1) && !contained(parent)) continue;
      offenders.push({ el: describe(el), left: Math.round(r.left), right: Math.round(r.right), width: Math.round(r.width) });
    }
  }
  // Contenu rogne : plus large que l'ancetre qui le coupe (overflow hidden/clip),
  // hors troncature volontaire (ellipsis, line-clamp) et texte sr-only.
  const clipped = [];
  for (const el of all) {
    if (hidden(el) || el.closest('.sr-only')) continue;
    const r = el.getBoundingClientRect();
    let clipper = null;
    for (let p = el.parentElement; p && p !== document.body; p = p.parentElement) {
      const s = getComputedStyle(p);
      if (/(auto|scroll)/.test(s.overflowX)) break;
      if (/(hidden|clip)/.test(s.overflowX)) { clipper = p; break; }
    }
    if (!clipper) continue;
    const cs = getComputedStyle(clipper);
    if (cs.textOverflow === 'ellipsis' || cs.webkitLineClamp !== 'none' && cs.webkitLineClamp) continue;
    const pr = clipper.getBoundingClientRect();
    if (r.right > pr.right + 2 && r.width > 8) {
      const parent = el.parentElement.getBoundingClientRect();
      if (el.parentElement !== clipper && parent.right > pr.right + 2) continue;
      clipped.push(describe(el) + ' +' + Math.round(r.right - pr.right) + 'px dans ' + describe(clipper).slice(0, 40));
    }
  }
  // Texte qui deborde de sa boite sans l'agrandir (overflow visible) : invisible
  // pour getBoundingClientRect, c'est ce qui elargissait la landing a 320 px.
  // Les badges places en absolu hors de leur parent (compteurs -right-2) sont
  // voulus : seul le debordement du flux est compte.
  const inFlowWidth = (el) => Math.max(0, ...[...el.children].filter((c) => !/(absolute|fixed)/.test(getComputedStyle(c).position)).map((c) => c.scrollWidth + c.offsetLeft - el.clientLeft));
  const spill = all.filter((el) => !hidden(el) && el.clientWidth > 0 && el.scrollWidth > el.clientWidth + 1
    && getComputedStyle(el).overflowX === 'visible' && !el.closest('.sr-only')
    && (el.children.length === 0 || inFlowWidth(el) > el.clientWidth + 1));
  const textSpill = spill.filter((el) => !spill.some((other) => other !== el && el.contains(other)))
    .filter((el) => !contained(el)).map((el) => describe(el) + ' ' + el.clientWidth + '/' + el.scrollWidth);
  const interactive = document.body.querySelectorAll('a[href],button,input:not([type=hidden]),select,textarea,[role=button],[role=tab],[role=menuitem],summary');
  const tiny = [], small = [];
  for (const el of interactive) {
    if (hidden(el)) continue;
    let r = el.getBoundingClientRect();
    // Case a cocher / radio : la zone utile est son label.
    if ((el.type === 'checkbox' || el.type === 'radio') && el.closest('label')) r = el.closest('label').getBoundingClientRect();
    const size = Math.min(r.width, r.height);
    const entry = describe(el) + ' ' + Math.round(r.width) + 'x' + Math.round(r.height);
    if (size < 24) tiny.push(entry); else if (size < 40) small.push(entry);
  }
  const tinyText = [];
  for (const el of all) {
    if (hidden(el)) continue;
    const direct = [...el.childNodes].some((n) => n.nodeType === 3 && n.textContent.trim().length > 1);
    if (!direct) continue;
    const size = parseFloat(getComputedStyle(el).fontSize);
    if (size < 12) tinyText.push(describe(el) + ' ' + size + 'px');
  }
  const scrollers = [];
  for (const el of all) {
    const s = getComputedStyle(el);
    if (/(auto|scroll)/.test(s.overflowX) && el.scrollWidth > el.clientWidth + 1 && !hidden(el)) scrollers.push(describe(el).slice(0, 80) + ' ' + el.clientWidth + '/' + el.scrollWidth);
  }
  const h1 = document.querySelector('main h1, h1');
  const h1Box = h1 && !hidden(h1) ? { text: h1.textContent.trim().slice(0, 60), height: Math.round(h1.getBoundingClientRect().height), fontSize: getComputedStyle(h1).fontSize } : null;
  const main = document.querySelector('main') || document.body;
  const mainStyle = getComputedStyle(main);
  return {
    vw, vh, docOverflow: document.documentElement.scrollWidth - vw, scrollHeight: document.documentElement.scrollHeight,
    offenders: offenders.slice(0, 12), offenderCount: offenders.length,
    clipped: clipped.slice(0, 10), clippedCount: clipped.length,
    textSpill: textSpill.slice(0, 10), textSpillCount: textSpill.length,
    tinyTargets: tiny.length, tinySamples: tiny.slice(0, 12), smallTargets: small.length, smallSamples: small.slice(0, 12),
    tinyText: tinyText.length, tinyTextSamples: tinyText.slice(0, 10), scrollers: scrollers.slice(0, 8), h1: h1Box,
    mainPadding: mainStyle.paddingLeft + ' / ' + mainStyle.paddingRight,
    errorBoundary: document.body.innerText.includes("This page couldn’t load") || document.body.innerText.includes('Application error'),
  };
})()`;
