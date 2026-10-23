import { useEffect, useMemo, useState } from 'react';

const pageTemplates = {
  '/': () => import('./templates/index.html?raw'),
  '/index.html': () => import('./templates/index.html?raw'),
  '/pages/document-view.html': () => import('./templates/document-view.html?raw'),
  '/pages/document-view': () => import('./templates/document-view.html?raw'),
  '/pages/library.html': () => import('./templates/library.html?raw'),
  '/pages/library': () => import('./templates/library.html?raw'),
  '/pages/login.html': () => import('./templates/login.html?raw'),
  '/pages/login': () => import('./templates/login.html?raw'),
  '/pages/notifications.html': () => import('./templates/notifications.html?raw'),
  '/pages/notifications': () => import('./templates/notifications.html?raw'),
  '/pages/parcours.html': () => import('./templates/parcours.html?raw'),
  '/pages/parcours': () => import('./templates/parcours.html?raw'),
  '/pages/profile.html': () => import('./templates/profile.html?raw'),
  '/pages/profile': () => import('./templates/profile.html?raw'),
  '/pages/register.html': () => import('./templates/register.html?raw'),
  '/pages/register': () => import('./templates/register.html?raw'),
  '/pages/upload.html': () => import('./templates/upload.html?raw'),
  '/pages/upload': () => import('./templates/upload.html?raw')
};

function getPageTemplateLoader(pathname) {
  const normalizedPath = pathname.replace(/\/+$/, '') || '/';
  return pageTemplates[normalizedPath] || pageTemplates['/'];
}

function LegacyPage({ loadTemplate }) {
  const [source, setSource] = useState('');
  const [templateError, setTemplateError] = useState('');
  const [scriptError, setScriptError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setSource('');
    setTemplateError('');
    setScriptError('');

    loadTemplate()
      .then((module) => {
        if (!cancelled) setSource(module.default);
      })
      .catch((error) => {
        console.error('Impossible de charger le modèle de page EduVault.', error);
        if (!cancelled) setTemplateError('Cette page n’a pas pu être chargée.');
      });

    return () => {
      cancelled = true;
    };
  }, [loadTemplate]);

  const page = useMemo(() => {
    if (!source) return null;
    const parsed = new DOMParser().parseFromString(source, 'text/html');
    const scripts = Array.from(parsed.querySelectorAll('script')).map((script) => ({
      src: script.getAttribute('src'),
      type: script.getAttribute('type') || '',
      text: script.textContent || ''
    }));

    parsed.body.querySelectorAll('script').forEach((script) => script.remove());

    return {
      body: parsed.body.innerHTML,
      bodyClass: parsed.body.className,
      bodyAttributes: Array.from(parsed.body.attributes)
        .filter((attribute) => attribute.name !== 'class')
        .map(({ name, value }) => [name, value]),
      htmlAttributes: Array.from(parsed.documentElement.attributes)
        .map(({ name, value }) => [name, value]),
      title: parsed.title,
      description: parsed.querySelector('meta[name="description"]')?.content,
      themeColor: parsed.querySelector('meta[name="theme-color"]')?.content,
      links: Array.from(parsed.head.querySelectorAll('link[rel]')).map((link) => ({
        rel: link.rel,
        href: link.getAttribute('href'),
        type: link.type,
        crossOrigin: link.crossOrigin,
        sizes: link.sizes?.value,
        integrity: link.integrity
      })),
      scripts
    };
  }, [source]);

  useEffect(() => {
    if (!page) return undefined;

    const previousTitle = document.title;
    const previousBodyClass = document.body.className;
    const previousBodyAttributes = Array.from(document.body.attributes)
      .filter((attribute) => attribute.name !== 'class')
      .map((attribute) => [attribute.name, attribute.value]);
    const previousHtmlAttributes = Array.from(document.documentElement.attributes)
      .map((attribute) => [attribute.name, attribute.value]);
    const addedLinks = [];

    document.title = page.title;
    document.body.className = page.bodyClass;

    for (const attribute of Array.from(document.body.attributes)) {
      if (attribute.name !== 'class') document.body.removeAttribute(attribute.name);
    }
    for (const [name, value] of page.bodyAttributes) {
      document.body.setAttribute(name, value);
    }
    for (const attribute of Array.from(document.documentElement.attributes)) {
      document.documentElement.removeAttribute(attribute.name);
    }
    for (const [name, value] of page.htmlAttributes) {
      document.documentElement.setAttribute(name, value);
    }

    if (page.description) {
      let description = document.head.querySelector('meta[name="description"]');
      if (!description) {
        description = document.createElement('meta');
        description.name = 'description';
        document.head.appendChild(description);
      }
      description.content = page.description;
    }

    if (page.themeColor) {
      let themeColor = document.head.querySelector('meta[name="theme-color"]');
      if (!themeColor) {
        themeColor = document.createElement('meta');
        themeColor.name = 'theme-color';
        document.head.appendChild(themeColor);
      }
      themeColor.content = page.themeColor;
    }

    for (const link of page.links) {
      if (!link.href) continue;
      const element = document.createElement('link');
      element.rel = link.rel;
      element.href = new URL(link.href, window.location.href).href;
      if (link.type) element.type = link.type;
      if (link.crossOrigin) element.crossOrigin = link.crossOrigin;
      if (link.sizes) element.sizes = link.sizes;
      if (link.integrity) element.integrity = link.integrity;
      document.head.appendChild(element);
      addedLinks.push(element);
    }

    let cancelled = false;
    const loadScripts = async () => {
      const errors = [];
      for (const scriptInfo of page.scripts) {
        if (cancelled) return;
        const script = document.createElement('script');
        if (scriptInfo.type) script.type = scriptInfo.type;

        if (scriptInfo.src) {
          script.src = new URL(scriptInfo.src, window.location.href).href;
          script.async = false;
          const loaded = await new Promise((resolve) => {
            script.addEventListener('load', resolve, { once: true });
            script.addEventListener('error', () => resolve(false), { once: true });
            document.body.appendChild(script);
          });
          if (loaded === false) {
            errors.push(`Impossible de charger le script ${scriptInfo.src}`);
          }
        } else {
          script.textContent = scriptInfo.text;
          document.body.appendChild(script);
        }
      }
      if (!cancelled && errors.length) {
        errors.forEach((message) => console.error(message));
        setScriptError(errors.join(' ; '));
      }
    };

    loadScripts();

    return () => {
      cancelled = true;
      addedLinks.forEach((link) => link.remove());
      document.title = previousTitle;
      document.body.className = previousBodyClass;
      for (const attribute of Array.from(document.body.attributes)) {
        if (attribute.name !== 'class') document.body.removeAttribute(attribute.name);
      }
      for (const [name, value] of previousBodyAttributes) {
        document.body.setAttribute(name, value);
      }
      for (const attribute of Array.from(document.documentElement.attributes)) {
        document.documentElement.removeAttribute(attribute.name);
      }
      for (const [name, value] of previousHtmlAttributes) {
        document.documentElement.setAttribute(name, value);
      }
    };
  }, [page]);

  if (templateError) {
    return <p role="alert">{templateError}</p>;
  }
  if (!page) {
    return <p role="status">Chargement de la page…</p>;
  }

  return (
    <>
      <div dangerouslySetInnerHTML={{ __html: page.body }} />
      {scriptError && (
        <p role="alert" className="legacy-script-error">
          Une fonctionnalité n’a pas pu être chargée : {scriptError}
        </p>
      )}
    </>
  );
}

function App() {
  const loadTemplate = getPageTemplateLoader(window.location.pathname);
  return <LegacyPage loadTemplate={loadTemplate} />;
}

export default App;
