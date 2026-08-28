/**
 * embed-html.js - Pull a standalone HTML document apart so the build can
 * embed it inside the site shell.
 *
 * INTENT: Two consumers share this code and must never drift:
 *   - wrap-reports.js  -> data/static_reports_html/*.html  -> reports/{slug}.html
 *   - build.js         -> pages with an `embedHtml` field in config/pages.json
 *                         (hidden destination pages such as bethany.html)
 * It lives in its own module (not inside wrap-reports.js) because
 * wrap-reports.js requires build.js; a require in the other direction would be
 * circular.
 *
 * scopeCSS() rewrites the document's selectors under a wrapper class
 * (body {} -> .scope {}, .x {} -> .scope .x {}) so report styles cannot leak
 * into the site chrome. @keyframes blocks are left untouched.
 */

/**
 * Extract content between tags using regex
 * Returns the first match or null
 */
function extractBetween(html, startTag, endTag) {
  const regex = new RegExp(`${startTag}([\\s\\S]*?)${endTag}`, 'i');
  const match = html.match(regex);
  return match ? match[1].trim() : null;
}

/**
 * Extract the <title> from HTML
 */
function extractTitle(html) {
  const match = html.match(/<title>([^<]*)<\/title>/i);
  return match ? match[1].trim() : null;
}

/**
 * Extract all <style> blocks from HTML
 */
function extractStyles(html) {
  const styles = [];
  const regex = /<style[^>]*>([\s\S]*?)<\/style>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    styles.push(match[1].trim());
  }
  return styles.join('\n\n');
}

/**
 * Extract external script URLs (src attributes)
 */
function extractExternalScripts(html) {
  const scripts = [];
  const regex = /<script[^>]+src=["']([^"']+)["'][^>]*>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    scripts.push(match[1]);
  }
  return scripts;
}

/**
 * Extract inline script content
 */
function extractInlineScripts(html) {
  const scripts = [];
  // Match script tags without src attribute that have content
  const regex = /<script(?![^>]*\ssrc=)[^>]*>([\s\S]*?)<\/script>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) {
    const content = match[1].trim();
    if (content) {
      scripts.push(content);
    }
  }
  return scripts;
}

/**
 * Extract body content (everything between <body> and </body>)
 * Strips out script tags since we handle those separately
 */
function extractBody(html) {
  let body = extractBetween(html, '<body[^>]*>', '</body>') || '';
  // Remove all script tags (both with src and inline) since we handle them separately
  body = body.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  return body.trim();
}

/**
 * Scope CSS selectors to prevent conflicts with site styles
 *
 * Transforms:
 *   body { ... } -> .report-slug { ... }
 *   * { ... } -> .report-slug * { ... }
 *   .class { ... } -> .report-slug .class { ... }
 *
 * This keeps report styles isolated to their wrapper div
 *
 * `scopeClass` is the full selector for the wrapper, e.g. ".report-bubble_watch"
 * or ".embed-bethany".
 */
function scopeCSS(css, scopeClass) {
  // Split CSS into rules (handling nested braces for @media etc.)
  let result = '';
  let depth = 0;
  let currentRule = '';

  for (let i = 0; i < css.length; i++) {
    const char = css[i];

    if (char === '{') {
      depth++;
      currentRule += char;
    } else if (char === '}') {
      depth--;
      currentRule += char;

      if (depth === 0) {
        // Process completed rule
        if (currentRule.trim().startsWith('@media')) {
          // Handle @media blocks
          result += scopeMediaBlock(currentRule, scopeClass);
        } else if (
          currentRule.trim().startsWith('@keyframes') ||
          currentRule.trim().startsWith('@-webkit-keyframes')
        ) {
          // Keep keyframes as-is
          result += currentRule;
        } else {
          // Regular rule
          result += scopeRule(currentRule, scopeClass);
        }
        currentRule = '';
      }
    } else {
      currentRule += char;
    }
  }

  return result;
}

/**
 * Scope a single CSS rule
 */
function scopeRule(rule, scopeClass) {
  // Match selector and body
  const match = rule.match(/^([^{]+)\{([\s\S]*)\}$/);
  if (!match) {
    return rule;
  }

  const selector = match[1].trim();
  const body = match[2];

  // Transform selector
  const scopedSelector = scopeSelector(selector, scopeClass);
  return `${scopedSelector} {\n${body}}\n`;
}

/**
 * Scope a @media block
 */
function scopeMediaBlock(block, scopeClass) {
  // Extract media query and inner rules
  const mediaMatch = block.match(/@media([^{]+)\{([\s\S]*)\}$/);
  if (!mediaMatch) {
    return block;
  }

  const mediaQuery = mediaMatch[1].trim();
  const innerCSS = mediaMatch[2];

  // Scope inner rules
  const scopedInner = scopeCSS(innerCSS, scopeClass);

  return `@media ${mediaQuery} {\n${scopedInner}}\n`;
}

/**
 * Scope a single selector
 */
function scopeSelector(selector, scopeClass) {
  // Handle multiple selectors (comma-separated)
  return selector
    .split(',')
    .map(s => {
      s = s.trim();

      // body -> .report-slug
      if (s === 'body') {
        return scopeClass;
      }

      // html -> .report-slug (treat similarly)
      if (s === 'html') {
        return scopeClass;
      }

      // * -> .report-slug *
      if (s === '*') {
        return `${scopeClass} *`;
      }

      // body.class or body .class -> .report-slug.class or .report-slug .class
      if (s.startsWith('body')) {
        return s.replace(/^body/, scopeClass);
      }

      // Regular selectors -> .report-slug .selector
      return `${scopeClass} ${s}`;
    })
    .join(', ');
}

module.exports = {
  extractTitle,
  extractStyles,
  extractExternalScripts,
  extractInlineScripts,
  extractBody,
  scopeCSS,
};
