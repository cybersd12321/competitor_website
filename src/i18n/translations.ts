export type Lang = 'en' | 'de' | 'es' | 'fr' | 'ja' | 'ru';

export const languages: Record<Lang, string> = {
  en: 'English',
  de: 'Deutsch',
  es: 'Español',
  fr: 'Français',
  ja: '日本語',
  ru: 'Русский',
};

export const t: Record<Lang, {
  nav: { features: string; howItWorks: string; faq: string; pricing: string; login: string; tryFree: string };
  hero: { pill: string; h1: string; sub: string; placeholder: string; cta: string; hint: string };
  logos: { label: string };
  how: { eyebrow: string; h2: string };
  steps: { eyebrow: string; title: string; body: string }[];
  matrix: { eyebrow: string; h2: string; sub: string; note: string };
  features: { eyebrow: string; h2: string };
  featureCards: { title: string; body: string }[];
  scrape: { eyebrow: string; h2: string; sub: string; step2Title: string; step2Body: string; step3Title: string; step3Body: string };
  testimonials: { h2: string };
  quotes: { quote: string; name: string; role: string }[];
  pricing: { eyebrow: string; h2: string; sub: string };
  plans: { name: string; desc: string; cta: string; features: string[] }[];
  cta: { h2: string; sub: string; cta: string };
  footer: { copy: string; tagline: string };
  footerCols: { heading: string; links: string[] }[];
  darkToggle: string;
}> = {
  en: {
    nav: { features: 'Features', howItWorks: 'How It Works', faq: 'FAQ', pricing: 'Pricing', login: 'Log In', tryFree: 'Try Free' },
    hero: {
      pill: 'Feature Gap Matrix — now with AI scoring',
      h1: 'Find every competitor. Map every gap.',
      sub: 'Paste your website URL. Our AI scrapes it, infers your niche, finds all similar products, and generates a feature gap matrix — in under 60 seconds.',
      placeholder: 'https://yourwebsite.com',
      cta: 'Analyze for Free',
      hint: 'No email required. Results in your browser.',
    },
    logos: { label: 'Used by teams at' },
    how: { eyebrow: 'How it works', h2: 'From URL to full competitor map in 60 seconds.' },
    steps: [
      { eyebrow: 'Step 1', title: 'Paste your URL, AI does the rest.', body: 'Our AI scrapes your website, reads your copy, and automatically infers your niche, product category, and target audience — no manual tagging required.' },
      { eyebrow: 'Step 2', title: 'Find every competitor in minutes.', body: 'We cross-reference dozens of sources — review sites, app stores, directories, and search rankings — to surface the full competitive landscape instantly.' },
      { eyebrow: 'Step 3', title: 'The Feature Gap Matrix.', body: "Get a visual, side-by-side matrix comparing your features against every competitor. Instantly see what you're missing, what's your moat, and where to invest next." },
    ],
    matrix: { eyebrow: 'Step 3', h2: 'The Feature Gap Matrix.', sub: 'A visual side-by-side comparison that shows exactly where you lead, where you lag, and what gaps nobody is filling.', note: 'This is a preview. Your real matrix is generated live from your URL.' },
    features: { eyebrow: 'Everything you need', h2: "Better than every tool you've tried." },
    featureCards: [
      { title: 'Auto-Scrape & Classify', body: 'Paste any URL. Our AI reads your site and extracts your niche, value prop, and audience in seconds. No form filling.' },
      { title: 'Feature Gap Matrix', body: 'Visual feature comparison table. See at a glance which competitors have what — and what white-space you can own.' },
      { title: 'No Email Required', body: 'Get instant results in your browser. No sign-up wall, no waiting for an inbox. Just paste and analyze.' },
      { title: 'Export as PDF / CSV', body: 'Download your full gap matrix and competitor list. Share with your team, investors, or board in one click.' },
      { title: 'Monitor Changes', body: 'Set alerts for when competitors launch new features, change pricing, or update their messaging. Stay a step ahead.' },
      { title: 'Team Collaboration', body: 'Share workspaces with your team. Leave comments on competitor features. Build a shared knowledge base.' },
    ],
    scrape: { eyebrow: 'Step 1 — Autoscrape', h2: "AI reads your site so you don't have to fill out a form.", sub: 'No keyword entry. No manual niche selection. Just your URL — our AI does the classification work automatically.', step2Title: 'Step 2 — Discovery', step2Body: 'We cross-reference review sites, app stores, directories, and search rankings to surface your complete competitive landscape in minutes.', step3Title: 'Step 3 — Feature Gap Matrix', step3Body: 'Get a visual, side-by-side matrix comparing your features against every competitor. See what you\'re missing, what\'s your moat, and where to invest next.' },
    testimonials: { h2: 'Founders who stopped guessing.' },
    quotes: [
      { quote: 'Found 12 competitors I had no idea existed. The gap matrix alone saved us weeks of manual research.', name: 'Chakshu Ar.', role: 'Founder, Techverse Solution' },
      { quote: "We've tried Semrush, Similarweb, and Crayon. This is the only tool that tells us what features we're missing.", name: 'Marcus T.', role: 'Head of Product, Storylane' },
      { quote: 'Pasted our URL and had the full competitor report right in the browser — instantly. No waiting, no email, just results.', name: 'Priya M.', role: 'CEO, Opnform' },
    ],
    pricing: { eyebrow: 'Pricing', h2: 'Start free. No credit card.', sub: 'Get real competitor intelligence instantly. Upgrade when you need more power.' },
    plans: [
      { name: 'Free', desc: 'For solo founders and explorers.', cta: 'Start for free', features: ['5 competitor scans / month', 'Basic gap matrix (5 features)', 'CSV export', 'No email required'] },
      { name: 'Pro', desc: 'For teams doing serious competitive research.', cta: 'Get started', features: ['Unlimited scans', 'Full gap matrix (50+ features)', 'PDF + CSV export', 'Change monitoring alerts', 'Team workspace (3 seats)', 'Priority support'] },
      { name: 'Enterprise', desc: 'For agencies and large product teams.', cta: 'Talk to us', features: ['Everything in Pro', 'Unlimited seats', 'API access', 'Custom integrations', 'Dedicated onboarding', 'SLA guarantee'] },
    ],
    cta: { h2: 'Know your competition. Own your market.', sub: 'Paste your URL and get a complete competitor analysis in under 60 seconds. Free forever for the basics.', cta: 'Analyze Free' },
    footer: { copy: '© 2025 findmycompetitor.com', tagline: 'AI-powered competitor analysis.' },
    footerCols: [
      { heading: 'Product', links: ['Auto-Scrape', 'Gap Matrix', 'Export Report'] },
      { heading: 'Company', links: ['About', 'Contact', 'Privacy Policy', 'Terms of Service'] },
    ],
    darkToggle: 'Toggle theme',
  },
  de: {
    nav: { features: 'Funktionen', howItWorks: 'So funktioniert\'s', faq: 'FAQ', pricing: 'Preise', login: 'Anmelden', tryFree: 'Kostenlos testen' },
    hero: {
      pill: 'Feature-Lücken-Matrix — jetzt mit KI-Bewertung',
      h1: 'Jeden Wettbewerber finden. Jede Lücke kartieren.',
      sub: 'Füge deine Website-URL ein. Unsere KI analysiert sie, erkennt deine Nische, findet ähnliche Produkte und erstellt eine Feature-Gap-Matrix — in unter 60 Sekunden.',
      placeholder: 'https://deinewebsite.de',
      cta: 'Kostenlos analysieren',
      hint: 'Keine E-Mail erforderlich. Ergebnisse im Browser.',
    },
    logos: { label: 'Verwendet von Teams bei' },
    how: { eyebrow: 'So funktioniert es', h2: 'Von der URL zur vollständigen Wettbewerbskarte in 60 Sekunden.' },
    steps: [
      { eyebrow: 'Schritt 1', title: 'URL einfügen, KI erledigt den Rest.', body: 'Unsere KI analysiert deine Website, liest deinen Text und ermittelt automatisch deine Nische, Produktkategorie und Zielgruppe — kein manuelles Tagging.' },
      { eyebrow: 'Schritt 2', title: 'Jeden Wettbewerber in Minuten finden.', body: 'Wir gleichen dutzende Quellen ab — Bewertungsseiten, App-Stores, Verzeichnisse und Suchrankings — um die vollständige Wettbewerbslandschaft sofort sichtbar zu machen.' },
      { eyebrow: 'Schritt 3', title: 'Die Feature-Gap-Matrix.', body: 'Erhalte eine visuelle, nebeneinander stehende Matrix, die deine Features mit jedem Wettbewerber vergleicht. Sieh sofort, was dir fehlt, was dein Alleinstellungsmerkmal ist und wo du investieren solltest.' },
    ],
    matrix: { eyebrow: 'Schritt 3', h2: 'Die Feature-Gap-Matrix.', sub: 'Ein visueller Direktvergleich, der genau zeigt, wo du führst, wo du zurückliegst und welche Lücken niemand füllt.', note: 'Dies ist eine Vorschau. Deine echte Matrix wird live aus deiner URL generiert.' },
    features: { eyebrow: 'Alles, was du brauchst', h2: 'Besser als jedes Tool, das du bisher probiert hast.' },
    featureCards: [
      { title: 'Auto-Scrape & Klassifizierung', body: 'Beliebige URL einfügen. Unsere KI liest deine Seite und extrahiert in Sekunden deine Nische, Value Proposition und Zielgruppe.' },
      { title: 'Feature-Gap-Matrix', body: 'Visuelle Feature-Vergleichstabelle. Sieh auf einen Blick, welche Wettbewerber was haben — und welche Marktlücken du besetzen kannst.' },
      { title: 'Keine E-Mail erforderlich', body: 'Erhalte sofortige Ergebnisse im Browser. Keine Anmeldeschranke, kein Warten auf ein Postfach. Einfach einfügen und analysieren.' },
      { title: 'Export als PDF / CSV', body: 'Lade deine vollständige Gap-Matrix und Wettbewerberliste herunter. Teile sie mit deinem Team, Investoren oder Board mit einem Klick.' },
      { title: 'Änderungen überwachen', body: 'Richte Benachrichtigungen ein, wenn Wettbewerber neue Features starten, Preise ändern oder ihre Botschaften aktualisieren.' },
      { title: 'Team-Zusammenarbeit', body: 'Teile Arbeitsbereiche mit deinem Team. Hinterlasse Kommentare zu Wettbewerber-Features. Baue eine gemeinsame Wissensbasis auf.' },
    ],
    scrape: { eyebrow: 'Schritt 1 — Autoscrape', h2: 'KI liest deine Seite, damit du kein Formular ausfüllen musst.', sub: 'Keine Stichwortangabe. Keine manuelle Nischenauswahl. Nur deine URL — unsere KI erledigt die Klassifizierungsarbeit automatisch.', step2Title: 'Schritt 2 — Entdeckung', step2Body: 'Wir gleichen Bewertungsseiten, App-Stores, Verzeichnisse und Suchrankings ab, um die vollständige Wettbewerbslandschaft in Minuten sichtbar zu machen.', step3Title: 'Schritt 3 — Feature-Gap-Matrix', step3Body: 'Erhalte eine visuelle, nebeneinander stehende Matrix, die deine Features mit jedem Wettbewerber vergleicht. Sieh, was dir fehlt, was dein Alleinstellungsmerkmal ist und wo du investieren solltest.' },
    testimonials: { h2: 'Gründer, die aufgehört haben zu raten.' },
    quotes: [
      { quote: '12 Wettbewerber gefunden, von denen ich keine Ahnung hatte. Die Gap-Matrix allein hat uns wochenlange manuelle Recherche erspart.', name: 'Sarah K.', role: 'Gründerin, Launchpad SaaS' },
      { quote: 'Wir haben Semrush, Similarweb und Crayon ausprobiert. Dies ist das einzige Tool, das uns sagt, welche Features uns fehlen.', name: 'Marcus T.', role: 'Head of Product, Storylane' },
      { quote: 'URL am Montag eingefügt, vollständige Präsentation für den Vorstand am Dienstag fertig. Absoluter Game Changer.', name: 'Priya M.', role: 'CEO, Opnform' },
    ],
    pricing: { eyebrow: 'Preise', h2: 'Kostenlos starten. Keine Kreditkarte.', sub: 'Erhalte sofort echte Wettbewerberintelligenz. Upgrade, wenn du mehr Power brauchst.' },
    plans: [
      { name: 'Kostenlos', desc: 'Für Solo-Gründer und Entdecker.', cta: 'Kostenlos starten', features: ['5 Wettbewerber-Scans / Monat', 'Basis-Gap-Matrix (5 Features)', 'CSV-Export', 'Keine E-Mail erforderlich'] },
      { name: 'Pro', desc: 'Für Teams mit ernsthafter Wettbewerbsforschung.', cta: 'Loslegen', features: ['Unbegrenzte Scans', 'Vollständige Gap-Matrix (50+ Features)', 'PDF + CSV Export', 'Änderungsüberwachungsalarme', 'Team-Workspace (3 Plätze)', 'Prioritätssupport'] },
      { name: 'Enterprise', desc: 'Für Agenturen und große Produktteams.', cta: 'Kontakt aufnehmen', features: ['Alles in Pro', 'Unbegrenzte Plätze', 'API-Zugang', 'Benutzerdefinierte Integrationen', 'Dediziertes Onboarding', 'SLA-Garantie'] },
    ],
    cta: { h2: 'Kenne deine Konkurrenz. Beherrsche deinen Markt.', sub: 'Füge deine URL ein und erhalte in unter 60 Sekunden eine vollständige Wettbewerbsanalyse. Für die Grundlagen kostenlos.', cta: 'Kostenlos analysieren' },
    footer: { copy: '© 2025 findmycompetitor.com', tagline: 'KI-gestützte Wettbewerbsanalyse.' },
    footerCols: [
      { heading: 'Produkt', links: ['Auto-Scrape', 'Gap-Matrix', 'Report exportieren'] },
      { heading: 'Unternehmen', links: ['Über uns', 'Kontakt', 'Datenschutz', 'Nutzungsbedingungen'] },
    ],
    darkToggle: 'Design wechseln',
  },
  es: {
    nav: { features: 'Funciones', howItWorks: 'Cómo funciona', faq: 'FAQ', pricing: 'Precios', login: 'Iniciar sesión', tryFree: 'Prueba gratis' },
    hero: {
      pill: 'Matriz de brechas de funciones — ahora con puntuación IA',
      h1: 'Encuentra cada competidor. Mapea cada brecha.',
      sub: 'Pega la URL de tu web. Nuestra IA la analiza, deduce tu nicho, encuentra productos similares y genera una matriz de brechas de funciones — en menos de 60 segundos.',
      placeholder: 'https://tuweb.com',
      cta: 'Analizar gratis',
      hint: 'Sin correo electrónico. Resultados en tu navegador.',
    },
    logos: { label: 'Usado por equipos en' },
    how: { eyebrow: 'Cómo funciona', h2: 'De la URL al mapa de competidores completo en 60 segundos.' },
    steps: [
      { eyebrow: 'Paso 1', title: 'Pega tu URL, la IA hace el resto.', body: 'Nuestra IA analiza tu web, lee tu contenido e infiere automáticamente tu nicho, categoría de producto y audiencia objetivo — sin etiquetado manual.' },
      { eyebrow: 'Paso 2', title: 'Encuentra cada competidor en minutos.', body: 'Cruzamos docenas de fuentes — sitios de reseñas, tiendas de apps, directorios y rankings de búsqueda — para mostrar el panorama competitivo completo al instante.' },
      { eyebrow: 'Paso 3', title: 'La Matriz de Brechas de Funciones.', body: 'Obtén una matriz visual comparando tus funciones con cada competidor. Ve al instante qué te falta, cuál es tu ventaja y dónde invertir.' },
    ],
    matrix: { eyebrow: 'Paso 3', h2: 'La Matriz de Brechas de Funciones.', sub: 'Una comparación visual que muestra exactamente dónde lideras, dónde te quedas atrás y qué huecos nadie está llenando.', note: 'Esta es una vista previa. Tu matriz real se genera en vivo desde tu URL.' },
    features: { eyebrow: 'Todo lo que necesitas', h2: 'Mejor que cualquier herramienta que hayas probado.' },
    featureCards: [
      { title: 'Auto-Scrape y Clasificación', body: 'Pega cualquier URL. Nuestra IA lee tu sitio y extrae tu nicho, propuesta de valor y audiencia en segundos.' },
      { title: 'Matriz de Brechas de Funciones', body: 'Tabla comparativa visual. Ve de un vistazo qué tienen los competidores — y qué espacio puedes ocupar.' },
      { title: 'Sin correo electrónico', body: 'Obtén resultados instantáneos en tu navegador. Sin muro de registro, sin esperar en tu bandeja de entrada.' },
      { title: 'Exportar como PDF / CSV', body: 'Descarga tu matriz completa y lista de competidores. Comparte con tu equipo, inversores o junta en un clic.' },
      { title: 'Monitorear cambios', body: 'Configura alertas cuando los competidores lancen nuevas funciones, cambien precios o actualicen su mensaje.' },
      { title: 'Colaboración en equipo', body: 'Comparte espacios de trabajo con tu equipo. Deja comentarios en funciones de competidores. Construye una base de conocimiento compartida.' },
    ],
    scrape: { eyebrow: 'Paso 1 — Autoscrape', h2: 'La IA lee tu sitio para que no tengas que rellenar formularios.', sub: 'Sin entrada de palabras clave. Sin selección manual de nicho. Solo tu URL — nuestra IA hace la clasificación automáticamente.', step2Title: 'Paso 2 — Descubrimiento', step2Body: 'Cruzamos sitios de reseñas, tiendas de apps, directorios y rankings de búsqueda para mostrar el panorama competitivo completo en minutos.', step3Title: 'Paso 3 — Matriz de Brechas de Funciones', step3Body: 'Obtén una matriz visual comparando tus funciones con cada competidor. Ve qué te falta, cuál es tu ventaja y dónde invertir.' },
    testimonials: { h2: 'Fundadores que dejaron de adivinar.' },
    quotes: [
      { quote: 'Encontré 12 competidores que no sabía que existían. La matriz de brechas sola nos ahorró semanas de investigación manual.', name: 'Sarah K.', role: 'Fundadora, Launchpad SaaS' },
      { quote: 'Probamos Semrush, Similarweb y Crayon. Esta es la única herramienta que nos dice qué funciones nos faltan.', name: 'Marcus T.', role: 'Jefe de Producto, Storylane' },
      { quote: 'Pegamos nuestra URL un lunes, teníamos la presentación completa para la junta el martes. Un cambio radical.', name: 'Priya M.', role: 'CEO, Opnform' },
    ],
    pricing: { eyebrow: 'Precios', h2: 'Empieza gratis. Sin tarjeta de crédito.', sub: 'Obtén inteligencia competitiva real al instante. Actualiza cuando necesites más potencia.' },
    plans: [
      { name: 'Gratis', desc: 'Para fundadores en solitario y exploradores.', cta: 'Empezar gratis', features: ['5 análisis de competidores / mes', 'Matriz básica (5 funciones)', 'Exportar CSV', 'Sin correo electrónico'] },
      { name: 'Pro', desc: 'Para equipos con investigación competitiva seria.', cta: 'Comenzar', features: ['Análisis ilimitados', 'Matriz completa (50+ funciones)', 'Exportar PDF + CSV', 'Alertas de cambios', 'Espacio de equipo (3 puestos)', 'Soporte prioritario'] },
      { name: 'Enterprise', desc: 'Para agencias y grandes equipos de producto.', cta: 'Hablar con nosotros', features: ['Todo en Pro', 'Puestos ilimitados', 'Acceso API', 'Integraciones personalizadas', 'Incorporación dedicada', 'Garantía SLA'] },
    ],
    cta: { h2: 'Conoce tu competencia. Domina tu mercado.', sub: 'Pega tu URL y obtén un análisis completo de competidores en menos de 60 segundos. Gratuito para siempre en lo básico.', cta: 'Analizar gratis' },
    footer: { copy: '© 2025 findmycompetitor.com', tagline: 'Análisis de competidores con IA.' },
    footerCols: [
      { heading: 'Producto', links: ['Auto-Scrape', 'Matriz de brechas', 'Exportar informe'] },
      { heading: 'Empresa', links: ['Acerca de', 'Contacto', 'Política de privacidad', 'Términos de servicio'] },
    ],
    darkToggle: 'Cambiar tema',
  },
  fr: {
    nav: { features: 'Fonctionnalités', howItWorks: 'Comment ça marche', faq: 'FAQ', pricing: 'Tarifs', login: 'Se connecter', tryFree: 'Essai gratuit' },
    hero: {
      pill: 'Matrice des écarts de fonctionnalités — maintenant avec scoring IA',
      h1: 'Trouvez chaque concurrent. Cartographiez chaque écart.',
      sub: "Collez l'URL de votre site. Notre IA l'analyse, déduit votre niche, trouve tous les produits similaires et génère une matrice des écarts — en moins de 60 secondes.",
      placeholder: 'https://votresite.fr',
      cta: 'Analyser gratuitement',
      hint: 'Sans e-mail requis. Résultats dans votre navigateur.',
    },
    logos: { label: 'Utilisé par des équipes chez' },
    how: { eyebrow: 'Comment ça marche', h2: "De l'URL à la carte complète des concurrents en 60 secondes." },
    steps: [
      { eyebrow: 'Étape 1', title: "Collez votre URL, l'IA fait le reste.", body: "Notre IA analyse votre site, lit votre contenu et déduit automatiquement votre niche, catégorie de produit et audience cible — sans étiquetage manuel." },
      { eyebrow: 'Étape 2', title: 'Trouvez chaque concurrent en minutes.', body: "Nous croisons des dizaines de sources — sites d'avis, boutiques d'apps, annuaires et classements de recherche — pour révéler le paysage concurrentiel complet instantanément." },
      { eyebrow: 'Étape 3', title: 'La Matrice des Écarts de Fonctionnalités.', body: "Obtenez une matrice visuelle comparant vos fonctionnalités avec chaque concurrent. Voyez immédiatement ce qui vous manque, votre avantage et où investir." },
    ],
    matrix: { eyebrow: 'Étape 3', h2: 'La Matrice des Écarts de Fonctionnalités.', sub: 'Une comparaison visuelle qui montre exactement où vous êtes en tête, où vous êtes en retard et quels écarts personne ne comble.', note: "Ceci est un aperçu. Votre vraie matrice est générée en direct depuis votre URL." },
    features: { eyebrow: "Tout ce dont vous avez besoin", h2: "Meilleur que tous les outils que vous avez essayés." },
    featureCards: [
      { title: 'Auto-Scrape & Classification', body: "Collez n'importe quelle URL. Notre IA lit votre site et extrait votre niche, proposition de valeur et audience en secondes." },
      { title: 'Matrice des Écarts', body: 'Tableau comparatif visuel. Voyez en un coup d\'œil ce que les concurrents ont — et quel espace vous pouvez occuper.' },
      { title: 'Sans e-mail requis', body: 'Obtenez des résultats instantanés dans votre navigateur. Sans mur d\'inscription, sans attendre dans une boîte mail.' },
      { title: 'Exporter en PDF / CSV', body: 'Téléchargez votre matrice complète et liste de concurrents. Partagez avec votre équipe, investisseurs ou conseil en un clic.' },
      { title: 'Surveiller les changements', body: 'Configurez des alertes quand les concurrents lancent de nouvelles fonctionnalités, changent leurs prix ou mettent à jour leur message.' },
      { title: 'Collaboration d\'équipe', body: "Partagez des espaces de travail avec votre équipe. Laissez des commentaires sur les fonctionnalités concurrentes. Construisez une base de connaissances partagée." },
    ],
    scrape: { eyebrow: 'Étape 1 — Autoscrape', h2: "L'IA lit votre site pour que vous n'ayez pas à remplir un formulaire.", sub: "Pas de saisie de mots-clés. Pas de sélection manuelle de niche. Juste votre URL — notre IA fait la classification automatiquement.", step2Title: 'Étape 2 — Découverte', step2Body: "Nous croisons des sites d'avis, boutiques d'apps, annuaires et classements de recherche pour révéler le paysage concurrentiel complet en minutes.", step3Title: 'Étape 3 — Matrice des Écarts', step3Body: "Obtenez une matrice visuelle comparant vos fonctionnalités avec chaque concurrent. Voyez ce qui vous manque, votre avantage et où investir." },
    testimonials: { h2: "Les fondateurs qui ont arrêté de deviner." },
    quotes: [
      { quote: "J'ai trouvé 12 concurrents dont je n'avais aucune idée. La matrice des écarts seule nous a économisé des semaines de recherche manuelle.", name: 'Sarah K.', role: 'Fondatrice, Launchpad SaaS' },
      { quote: "Nous avons essayé Semrush, Similarweb et Crayon. C'est le seul outil qui nous dit quelles fonctionnalités nous manquent.", name: 'Marcus T.', role: 'Responsable Produit, Storylane' },
      { quote: "URL collée un lundi, présentation complète pour le conseil le mardi. Un vrai changement de jeu.", name: 'Priya M.', role: 'PDG, Opnform' },
    ],
    pricing: { eyebrow: 'Tarifs', h2: 'Commencez gratuitement. Sans carte de crédit.', sub: 'Obtenez une vraie intelligence concurrentielle instantanément. Passez au niveau supérieur quand vous avez besoin de plus de puissance.' },
    plans: [
      { name: 'Gratuit', desc: 'Pour les fondateurs solo et les explorateurs.', cta: 'Commencer gratuitement', features: ['5 analyses de concurrents / mois', 'Matrice de base (5 fonctionnalités)', 'Export CSV', 'Sans e-mail requis'] },
      { name: 'Pro', desc: 'Pour les équipes en recherche concurrentielle sérieuse.', cta: 'Commencer', features: ['Analyses illimitées', 'Matrice complète (50+ fonctionnalités)', 'Export PDF + CSV', 'Alertes de changements', 'Espace équipe (3 sièges)', 'Support prioritaire'] },
      { name: 'Entreprise', desc: 'Pour les agences et grandes équipes produit.', cta: 'Nous contacter', features: ['Tout dans Pro', 'Sièges illimités', 'Accès API', 'Intégrations personnalisées', 'Onboarding dédié', 'Garantie SLA'] },
    ],
    cta: { h2: 'Connaissez votre concurrence. Dominez votre marché.', sub: "Collez votre URL et obtenez une analyse complète des concurrents en moins de 60 secondes. Gratuit pour toujours pour les bases.", cta: 'Analyser gratuitement' },
    footer: { copy: '© 2025 findmycompetitor.com', tagline: "Analyse concurrentielle propulsée par l'IA." },
    footerCols: [
      { heading: 'Produit', links: ['Auto-Scrape', 'Matrice des écarts', 'Exporter le rapport'] },
      { heading: 'Entreprise', links: ['À propos', 'Contact', 'Politique de confidentialité', "Conditions d'utilisation"] },
    ],
    darkToggle: 'Changer le thème',
  },
  ja: {
    nav: { features: '機能', howItWorks: '使い方', faq: 'FAQ', pricing: '料金', login: 'ログイン', tryFree: '無料で試す' },
    hero: {
      pill: '機能ギャップマトリクス — AIスコアリング搭載',
      h1: 'すべての競合を発見。すべてのギャップを可視化。',
      sub: 'ウェブサイトのURLを貼るだけ。AIがサイトを解析し、ニッチを推定、類似製品を探し出し、機能ギャップマトリクスを生成 — 60秒以内に。',
      placeholder: 'https://yourwebsite.com',
      cta: '無料で分析する',
      hint: 'メールアドレス不要。ブラウザ上で結果を表示。',
    },
    logos: { label: '導入企業' },
    how: { eyebrow: '使い方', h2: 'URLから競合マップ完成まで60秒。' },
    steps: [
      { eyebrow: 'ステップ1', title: 'URLを貼るだけ、あとはAIにおまかせ。', body: 'AIがウェブサイトをスクレイピングし、コンテンツを読み取り、ニッチ・製品カテゴリ・ターゲット顧客を自動推定 — 手動タグ付け不要。' },
      { eyebrow: 'ステップ2', title: '数分ですべての競合を発見。', body: 'レビューサイト、アプリストア、ディレクトリ、検索ランキングなど多数のソースを横断参照し、競合環境全体を瞬時に把握。' },
      { eyebrow: 'ステップ3', title: '機能ギャップマトリクス。', body: 'あなたの機能とすべての競合を横並びで比較するビジュアルマトリクス。不足している点、強み、次の投資先を即座に確認。' },
    ],
    matrix: { eyebrow: 'ステップ3', h2: '機能ギャップマトリクス。', sub: 'どこでリードしているか、どこで遅れているか、誰も埋めていないギャップを一目で確認できるビジュアル比較。', note: 'これはプレビューです。実際のマトリクスはURLからリアルタイム生成されます。' },
    features: { eyebrow: '必要なすべてが揃っています', h2: 'これまで試したどのツールよりも優れています。' },
    featureCards: [
      { title: '自動スクレイプ＆分類', body: '任意のURLを貼るだけ。AIがサイトを読み込み、ニッチ・バリュープロポジション・ターゲット顧客を数秒で抽出。' },
      { title: '機能ギャップマトリクス', body: 'ビジュアルな機能比較テーブル。競合が持っているものと、あなたが占有できる空白領域を一目で確認。' },
      { title: 'メールアドレス不要', body: 'ブラウザで即座に結果を取得。サインアップ不要、受信トレイを待つ必要なし。貼って分析するだけ。' },
      { title: 'PDF / CSV エクスポート', body: '完全なギャップマトリクスと競合リストをダウンロード。チーム、投資家、取締役会にワンクリックで共有。' },
      { title: '変更監視', body: '競合が新機能をリリースしたり、価格変更やメッセージ更新をしたときにアラートを設定。常に一歩先へ。' },
      { title: 'チームコラボレーション', body: 'チームとワークスペースを共有。競合機能にコメントを残す。共有ナレッジベースを構築。' },
    ],
    scrape: { eyebrow: 'ステップ1 — 自動スクレイプ', h2: 'AIがサイトを読むので、フォーム入力は不要。', sub: 'キーワード入力なし。手動でのニッチ選択なし。URLだけで — AIが自動的に分類作業を行います。', step2Title: 'ステップ2 — 発見', step2Body: 'レビューサイト、アプリストア、ディレクトリ、検索ランキングを横断参照し、競合環境全体を数分で把握します。', step3Title: 'ステップ3 — 機能ギャップマトリクス', step3Body: 'あなたの機能とすべての競合を横並びで比較するビジュアルマトリクス。不足している点、強み、次の投資先を即座に確認。' },
    testimonials: { h2: '推測をやめた創業者たち。' },
    quotes: [
      { quote: '存在すら知らなかった12の競合を発見。ギャップマトリクスだけで何週間もの手動リサーチを省けました。', name: 'Sarah K.', role: '創業者、Launchpad SaaS' },
      { quote: 'Semrush、Similarweb、Crayonを試しました。どの機能が不足しているかを教えてくれるのはこのツールだけです。', name: 'Marcus T.', role: 'Head of Product、Storylane' },
      { quote: '月曜日にURLを貼り付け、火曜日には取締役会向けの完全なデッキが完成。革命的です。', name: 'Priya M.', role: 'CEO、Opnform' },
    ],
    pricing: { eyebrow: '料金', h2: '無料で始める。クレジットカード不要。', sub: 'リアルな競合インテリジェンスを即座に取得。より多くの機能が必要になったらアップグレード。' },
    plans: [
      { name: '無料', desc: 'ソロ創業者と探索者向け。', cta: '無料で始める', features: ['競合スキャン5回/月', '基本ギャップマトリクス（5機能）', 'CSVエクスポート', 'メールアドレス不要'] },
      { name: 'Pro', desc: '本格的な競合調査を行うチーム向け。', cta: '始める', features: ['無制限スキャン', '完全ギャップマトリクス（50+機能）', 'PDF + CSVエクスポート', '変更監視アラート', 'チームワークスペース（3席）', '優先サポート'] },
      { name: 'Enterprise', desc: 'エージェンシーや大規模プロダクトチーム向け。', cta: 'お問い合わせ', features: ['Proのすべて', '無制限席', 'APIアクセス', 'カスタム統合', '専用オンボーディング', 'SLA保証'] },
    ],
    cta: { h2: '競合を知る。市場を制する。', sub: 'URLを貼り付けて60秒以内に完全な競合分析を取得。基本機能は永久無料。', cta: '無料で分析する' },
    footer: { copy: '© 2025 findmycompetitor.com', tagline: 'AIによる競合分析。' },
    footerCols: [
      { heading: '製品', links: ['自動スクレイプ', 'ギャップマトリクス', 'レポートエクスポート'] },
      { heading: '会社', links: ['会社概要', 'お問い合わせ', 'プライバシーポリシー', '利用規約'] },
    ],
    darkToggle: 'テーマ切替',
  },
  ru: {
    nav: { features: 'Возможности', howItWorks: 'Как это работает', faq: 'FAQ', pricing: 'Цены', login: 'Войти', tryFree: 'Попробовать бесплатно' },
    hero: {
      pill: 'Матрица пробелов функций — теперь с ИИ-оценкой',
      h1: 'Найдите каждого конкурента. Нанесите каждый пробел на карту.',
      sub: 'Вставьте URL вашего сайта. Наш ИИ анализирует его, определяет вашу нишу, находит похожие продукты и генерирует матрицу пробелов — менее чем за 60 секунд.',
      placeholder: 'https://вашсайт.ru',
      cta: 'Анализировать бесплатно',
      hint: 'Без электронной почты. Результаты в браузере.',
    },
    logos: { label: 'Используется командами в' },
    how: { eyebrow: 'Как это работает', h2: 'От URL до полной карты конкурентов за 60 секунд.' },
    steps: [
      { eyebrow: 'Шаг 1', title: 'Вставьте URL, ИИ сделает остальное.', body: 'Наш ИИ анализирует ваш сайт, читает контент и автоматически определяет вашу нишу, категорию продукта и целевую аудиторию — без ручной разметки.' },
      { eyebrow: 'Шаг 2', title: 'Найдите каждого конкурента за минуты.', body: 'Мы перекрёстно проверяем десятки источников — сайты отзывов, магазины приложений, каталоги и поисковые рейтинги — чтобы мгновенно показать полный конкурентный ландшафт.' },
      { eyebrow: 'Шаг 3', title: 'Матрица пробелов функций.', body: 'Получите визуальную матрицу для сравнения ваших функций с каждым конкурентом. Мгновенно увидьте, чего вам не хватает, в чём ваше преимущество и куда инвестировать.' },
    ],
    matrix: { eyebrow: 'Шаг 3', h2: 'Матрица пробелов функций.', sub: 'Визуальное сравнение, которое показывает, где вы лидируете, где отстаёте и какие пробелы никто не заполняет.', note: 'Это предварительный просмотр. Ваша настоящая матрица генерируется в реальном времени из вашего URL.' },
    features: { eyebrow: 'Всё, что вам нужно', h2: 'Лучше любого инструмента, который вы пробовали.' },
    featureCards: [
      { title: 'Авто-Скрапинг и Классификация', body: 'Вставьте любой URL. Наш ИИ читает ваш сайт и извлекает нишу, ценностное предложение и аудиторию за секунды.' },
      { title: 'Матрица пробелов функций', body: 'Визуальная таблица сравнения функций. Сразу видно, что есть у конкурентов — и какое пространство вы можете занять.' },
      { title: 'Без электронной почты', body: 'Получайте мгновенные результаты в браузере. Никаких стен регистрации, никакого ожидания в почтовом ящике.' },
      { title: 'Экспорт в PDF / CSV', body: 'Скачайте полную матрицу и список конкурентов. Поделитесь с командой, инвесторами или советом директоров одним кликом.' },
      { title: 'Отслеживание изменений', body: 'Настройте оповещения, когда конкуренты запускают новые функции, меняют цены или обновляют сообщения.' },
      { title: 'Командная работа', body: 'Делитесь рабочими пространствами с командой. Оставляйте комментарии к функциям конкурентов. Создавайте общую базу знаний.' },
    ],
    scrape: { eyebrow: 'Шаг 1 — Автоскрапинг', h2: 'ИИ читает ваш сайт, чтобы вам не приходилось заполнять форму.', sub: 'Без ввода ключевых слов. Без ручного выбора ниши. Только ваш URL — наш ИИ выполняет классификацию автоматически.', step2Title: 'Шаг 2 — Обнаружение', step2Body: 'Мы перекрёстно проверяем сайты отзывов, магазины приложений, каталоги и поисковые рейтинги, чтобы показать полный конкурентный ландшафт за минуты.', step3Title: 'Шаг 3 — Матрица пробелов функций', step3Body: 'Получите визуальную матрицу для сравнения ваших функций с каждым конкурентом. Увидьте, чего не хватает, в чём ваше преимущество и куда инвестировать.' },
    testimonials: { h2: 'Основатели, которые перестали гадать.' },
    quotes: [
      { quote: 'Нашёл 12 конкурентов, о которых не знал. Одна только матрица пробелов сэкономила нам недели ручных исследований.', name: 'Sarah K.', role: 'Основатель, Launchpad SaaS' },
      { quote: 'Пробовали Semrush, Similarweb и Crayon. Это единственный инструмент, который говорит нам, каких функций нам не хватает.', name: 'Marcus T.', role: 'Руководитель продукта, Storylane' },
      { quote: 'Вставили URL в понедельник, к вторнику готова полная презентация для совета директоров. Революционно.', name: 'Priya M.', role: 'CEO, Opnform' },
    ],
    pricing: { eyebrow: 'Цены', h2: 'Начните бесплатно. Без кредитной карты.', sub: 'Получите реальную конкурентную разведку мгновенно. Переходите на следующий уровень, когда понадобится больше возможностей.' },
    plans: [
      { name: 'Бесплатно', desc: 'Для соло-основателей и исследователей.', cta: 'Начать бесплатно', features: ['5 сканирований конкурентов / месяц', 'Базовая матрица (5 функций)', 'Экспорт CSV', 'Без электронной почты'] },
      { name: 'Pro', desc: 'Для команд, занимающихся серьёзными конкурентными исследованиями.', cta: 'Начать', features: ['Неограниченные сканирования', 'Полная матрица (50+ функций)', 'Экспорт PDF + CSV', 'Оповещения об изменениях', 'Командное пространство (3 места)', 'Приоритетная поддержка'] },
      { name: 'Корпоративный', desc: 'Для агентств и крупных продуктовых команд.', cta: 'Связаться с нами', features: ['Всё из Pro', 'Неограниченные места', 'Доступ к API', 'Кастомные интеграции', 'Выделенный онбординг', 'Гарантия SLA'] },
    ],
    cta: { h2: 'Знайте конкурентов. Владейте рынком.', sub: 'Вставьте URL и получите полный анализ конкурентов менее чем за 60 секунд. Базовые функции — бесплатно навсегда.', cta: 'Анализировать бесплатно' },
    footer: { copy: '© 2025 findmycompetitor.com', tagline: 'Конкурентный анализ на базе ИИ.' },
    footerCols: [
      { heading: 'Продукт', links: ['Авто-Скрапинг', 'Матрица пробелов', 'Экспорт отчёта'] },
      { heading: 'Компания', links: ['О нас', 'Контакты', 'Политика конфиденциальности', 'Условия использования'] },
    ],
    darkToggle: 'Сменить тему',
  },
};
