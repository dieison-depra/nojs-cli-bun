import { parseHTML } from 'linkedom'

export default {
  name: 'inject-head-attrs',
  description:
    'Inject static page-title, page-description, page-canonical, and page-jsonld into <head>',

  async process(html, { filePath, _config }) {
    const { document: doc } = parseHTML(html)
    const head = doc.head
    if (!head) return html

    let modified = false

    // ── Body directives (processed first — highest precedence) ────────────────
    for (const el of doc.querySelectorAll('[page-title]:not(template[route])')) {
      const val = extractLiteral(el.getAttribute('page-title'))
      if (val == null) continue
      setTitle(head, doc, val)
      modified = true
    }

    for (const el of doc.querySelectorAll('[page-description]:not(template[route])')) {
      const val = extractLiteral(el.getAttribute('page-description'))
      if (val == null) continue
      setDescription(head, doc, val)
      modified = true
    }

    for (const el of doc.querySelectorAll('[page-canonical]:not(template[route])')) {
      const val = extractLiteral(el.getAttribute('page-canonical'))
      if (val == null) continue
      setCanonical(head, doc, val)
      modified = true
    }

    for (const el of doc.querySelectorAll('[page-jsonld]:not(template[route])')) {
      const json = (el.textContent || '').trim()
      if (!json) continue
      setJsonLd(head, doc, json)
      modified = true
    }

    // ── Route template head attributes ────────────────────────────────────────
    const routeTemplates = [...doc.querySelectorAll('template[route]')]
    const defaultTpl =
      routeTemplates.find(t => t.getAttribute('route') === '/') || routeTemplates[0]

    for (const tpl of routeTemplates) {
      const isSpaDefault = tpl === defaultTpl
      const isOnlyTemplate = routeTemplates.length === 1
      if (!isSpaDefault && !isOnlyTemplate) continue

      const titleVal = extractLiteral(tpl.getAttribute('page-title'))
      if (titleVal != null && !doc.querySelector('[page-title]:not(template[route])')) {
        setTitle(head, doc, titleVal)
        modified = true
      }

      const descVal = extractLiteral(tpl.getAttribute('page-description'))
      if (descVal != null && !doc.querySelector('[page-description]:not(template[route])')) {
        setDescription(head, doc, descVal)
        modified = true
      }

      const canonicalVal = extractLiteral(tpl.getAttribute('page-canonical'))
      if (canonicalVal != null && !doc.querySelector('[page-canonical]:not(template[route])')) {
        setCanonical(head, doc, canonicalVal)
        modified = true
      }

      const jsonldAttr = tpl.getAttribute('page-jsonld')
      if (jsonldAttr && !doc.querySelector('[page-jsonld]:not(template[route])')) {
        setJsonLd(head, doc, jsonldAttr)
        modified = true
      }
    }

    return modified ? doc.toString() : html
  },
}

function extractLiteral(expr) {
  if (!expr) return null
  const m = expr.trim().match(/^(['"])([\s\S]*)\1$/)
  return m ? m[2] : null
}

function setTitle(head, doc, value) {
  let el = head.querySelector('title')
  if (!el) {
    el = doc.createElement('title')
    head.appendChild(el)
  }
  el.textContent = value
}

function setDescription(head, doc, value) {
  let el = head.querySelector('meta[name="description"]')
  if (!el) {
    el = doc.createElement('meta')
    el.setAttribute('name', 'description')
    head.appendChild(el)
  }
  el.setAttribute('content', value)
}

function setCanonical(head, doc, value) {
  let el = head.querySelector('link[rel="canonical"]')
  if (!el) {
    el = doc.createElement('link')
    el.setAttribute('rel', 'canonical')
    head.appendChild(el)
  }
  el.setAttribute('href', value)
}

function setJsonLd(head, doc, json) {
  let el = head.querySelector('script[type="application/ld+json"][data-nojs]')
  if (!el) {
    el = doc.createElement('script')
    el.setAttribute('type', 'application/ld+json')
    el.setAttribute('data-nojs', '')
    head.appendChild(el)
  }
  el.textContent = json
}
