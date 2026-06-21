export type Lang = "en" | "es";

export const LANGS: Lang[] = ["en", "es"];

// Flat dot-keyed dictionaries. UI chrome + educational/methodology copy are
// translated; scraped listing prose stays in its source language (English).
type Dict = Record<string, string>;

const en: Dict = {
  "lang.name": "English",
  "nav.listings": "Listings",
  "nav.market": "Market",
  "nav.method": "How scoring works",

  "hero.eyebrow": "PropIntel",
  "hero.title": "Find the undervalued deal before everyone else.",
  "hero.subtitle":
    "Investment scoring on real Austin listings, value vs. comps, cap rate, hidden risks, and a concrete action plan. Built for investors who screen a hundred properties to buy one.",
  "hero.stat.properties": "Properties",
  "hero.stat.neighborhoods": "Neighborhoods",
  "hero.stat.median": "Median price",
  "hero.stat.opportunities": "Opportunities",
  "hero.realData": "Real Zillow data, verified",

  "controls.all": "All",
  "controls.showing": "Showing {n} {scope}",
  "controls.scope.all": "properties",
  "controls.scope.in": "in {name}",
  "sort.featured": "Featured",
  "sort.priceAsc": "Price ↑",
  "sort.priceDesc": "Price ↓",
  "sort.newest": "Newest",

  "card.beds": "Beds",
  "card.baths": "Baths",
  "card.sqft": "Sqft",
  "card.built": "Built",
  "card.analyze": "Analyze",
  "card.vsComps": "vs comps",

  "panel.overall": "overall",
  "panel.value": "Value (vs. comps)",
  "panel.opportunity": "Opportunity (upside)",
  "panel.underwriting": "Underwriting",
  "panel.highlights": "Highlights",
  "panel.risks": "Risk factors",
  "panel.actionPlan": "Action plan",
  "panel.zillow": "View on Zillow ↗",
  "panel.map": "View on map ↗",
  "panel.engine": "engine",
  "panel.disclaimer":
    "Educational analysis on real listing data, not financial advice. Verify all figures independently before transacting.",
  "panel.analyzing": "Analyzing property…",
  "panel.retry": "Retry",
  "panel.close": "Close",
  "panel.srcReal": "Real Zillow data",
  "metric.ppsf": "$/sqft",
  "metric.cap": "Cap rate",
  "metric.rent": "Rent/price",
  "metric.grm": "GRM",
  "metric.cashflow": "Est. cash flow",
  "metric.age": "Age",
  "metric.vsAvg": "{v}% vs avg",

  "verdict.Strong Buy": "Strong Buy",
  "verdict.Worth a Look": "Worth a Look",
  "verdict.Pass": "Pass",

  // Market / education
  "market.title": "How the economy moves housing",
  "market.intro":
    "Housing never moves in a vacuum. When the Federal Reserve changes its policy rate, mortgage rates follow, which reshapes what buyers can afford, which moves prices. The figures below are live from the Federal Reserve (FRED), so the math in this app rests on real conditions, not placeholders.",
  "market.asOf": "as of {date}",
  "market.yoy": "{v} vs. a year ago",
  "market.m.mortgage": "30-yr mortgage rate",
  "market.m.fed": "Fed funds rate",
  "market.m.austin": "Austin home prices (YoY)",
  "market.m.national": "U.S. home prices (YoY)",
  "market.chain.title": "The chain reaction",
  "market.chain.body":
    "Lower Fed rate → cheaper mortgages → buyers can finance more → demand and prices rise. Higher rates do the reverse. A single point on a 30-year mortgage changes the monthly payment on a $400k home by roughly $250.",
  "market.austin.title": "Why Austin is different right now",
  "market.austin.body":
    "Nationally, home prices are still edging up. Austin is doing the opposite: it built and bought heavily through the pandemic boom, and prices have softened since. That gap is why these listings show repeated price cuts and longer days on market, real leverage for a patient buyer.",
  "market.source": "Source: Federal Reserve Economic Data (FRED), St. Louis Fed. Public series, no API key.",

  // Methodology
  "method.title": "How a listing is scored",
  "method.intro":
    "No black box. Every score traces to numbers you can see in the analysis panel. Here is exactly what the engine measures.",
  "method.value.title": "Value score",
  "method.value.body":
    "How cheap the listing is relative to evidence: its price per square foot against the median for its actual ZIP (203 real listings aggregated across 41 Austin ZIPs), plus its gap to Zillow's Zestimate where one exists, plus a nudge from the cap rate.",
  "method.opp.title": "Opportunity score",
  "method.opp.body":
    "Forward upside from seller motivation and leverage: the count and size of real price cuts, days on market, whether the listing language flags value-add (investor / renovation / as-is), and how far below comps it already sits.",
  "method.cap.title": "Cap rate & cash flow",
  "method.cap.body":
    "Net operating income divided by price. Income is the Zillow rent estimate when present, otherwise a transparent model (flagged as such). Expenses are the real property tax, real HOA, and a 30% load for vacancy, maintenance, insurance and management. Cash flow then subtracts the mortgage.",
  "method.assumptions.title": "Stated assumptions",
  "method.assumptions.down": "Down payment",
  "method.assumptions.rate": "Mortgage rate",
  "method.assumptions.rateNote": "live from FRED",
  "method.assumptions.term": "Loan term",
  "method.assumptions.opex": "Operating expenses",
  "method.assumptions.years": "30 yrs",
  "method.verdict.title": "Turning scores into a verdict",
  "method.verdict.body":
    "Overall = 55% value + 45% opportunity. 70+ is a Strong Buy (unless five or more risk flags drop it a notch), 50–69 is Worth a Look, below 50 is a Pass. Passing on a weak deal is the point.",
};

const es: Dict = {
  "lang.name": "Español",
  "nav.listings": "Propiedades",
  "nav.market": "Mercado",
  "nav.method": "Cómo se califica",

  "hero.eyebrow": "PropIntel",
  "hero.title": "Encuentra la oportunidad infravalorada antes que nadie.",
  "hero.subtitle":
    "Puntuación de inversión sobre propiedades reales de Austin: valor frente a comparables, tasa de capitalización, riesgos ocultos y un plan de acción concreto. Para inversionistas que revisan cien propiedades para comprar una.",
  "hero.stat.properties": "Propiedades",
  "hero.stat.neighborhoods": "Zonas",
  "hero.stat.median": "Precio medio",
  "hero.stat.opportunities": "Oportunidades",
  "hero.realData": "Datos reales de Zillow, verificados",

  "controls.all": "Todas",
  "controls.showing": "Mostrando {n} {scope}",
  "controls.scope.all": "propiedades",
  "controls.scope.in": "en {name}",
  "sort.featured": "Destacadas",
  "sort.priceAsc": "Precio ↑",
  "sort.priceDesc": "Precio ↓",
  "sort.newest": "Más nuevas",

  "card.beds": "Recám.",
  "card.baths": "Baños",
  "card.sqft": "Pies²",
  "card.built": "Año",
  "card.analyze": "Analizar",
  "card.vsComps": "vs comp.",

  "panel.overall": "global",
  "panel.value": "Valor (vs. comparables)",
  "panel.opportunity": "Oportunidad (potencial)",
  "panel.underwriting": "Análisis financiero",
  "panel.highlights": "Puntos a favor",
  "panel.risks": "Factores de riesgo",
  "panel.actionPlan": "Plan de acción",
  "panel.zillow": "Ver en Zillow ↗",
  "panel.map": "Ver en mapa ↗",
  "panel.engine": "motor",
  "panel.disclaimer":
    "Análisis educativo sobre datos reales de propiedades, no es asesoría financiera. Verifica todas las cifras de forma independiente antes de transar.",
  "panel.analyzing": "Analizando propiedad…",
  "panel.retry": "Reintentar",
  "panel.close": "Cerrar",
  "panel.srcReal": "Datos reales de Zillow",
  "metric.ppsf": "$/pie²",
  "metric.cap": "Tasa cap.",
  "metric.rent": "Renta/precio",
  "metric.grm": "GRM",
  "metric.cashflow": "Flujo est.",
  "metric.age": "Antigüedad",
  "metric.vsAvg": "{v}% vs media",

  "verdict.Strong Buy": "Compra fuerte",
  "verdict.Worth a Look": "Vale la pena",
  "verdict.Pass": "Descartar",

  "market.title": "Cómo la economía mueve la vivienda",
  "market.intro":
    "La vivienda nunca se mueve en el vacío. Cuando la Reserva Federal cambia su tasa de política, las tasas hipotecarias la siguen, lo que cambia cuánto puede pagar un comprador, lo que mueve los precios. Las cifras de abajo vienen en vivo de la Reserva Federal (FRED), así que las matemáticas de esta app se basan en condiciones reales, no en marcadores de posición.",
  "market.asOf": "al {date}",
  "market.yoy": "{v} vs. hace un año",
  "market.m.mortgage": "Tasa hipotecaria 30 años",
  "market.m.fed": "Tasa de la Fed",
  "market.m.austin": "Precios en Austin (interanual)",
  "market.m.national": "Precios en EE. UU. (interanual)",
  "market.chain.title": "La reacción en cadena",
  "market.chain.body":
    "Tasa de la Fed más baja → hipotecas más baratas → los compradores financian más → la demanda y los precios suben. Tasas más altas hacen lo contrario. Un solo punto en una hipoteca a 30 años cambia el pago mensual de una casa de $400k en unos $250.",
  "market.austin.title": "Por qué Austin es diferente ahora",
  "market.austin.body":
    "A nivel nacional, los precios siguen subiendo levemente. Austin hace lo contrario: construyó y compró mucho durante el auge de la pandemia, y los precios han bajado desde entonces. Esa brecha explica por qué estas propiedades muestran recortes de precio repetidos y más días en el mercado: una ventaja real para un comprador paciente.",
  "market.source": "Fuente: Federal Reserve Economic Data (FRED), Fed de San Luis. Series públicas, sin clave de API.",

  "method.title": "Cómo se califica una propiedad",
  "method.intro":
    "Sin caja negra. Cada puntuación se rastrea a números visibles en el panel de análisis. Esto es exactamente lo que mide el motor.",
  "method.value.title": "Puntuación de valor",
  "method.value.body":
    "Qué tan barata está la propiedad frente a la evidencia: su precio por pie cuadrado contra la mediana de su código postal real (203 propiedades reales agregadas en 41 códigos postales de Austin), más su diferencia con el Zestimate de Zillow cuando existe, más un ajuste por la tasa de capitalización.",
  "method.opp.title": "Puntuación de oportunidad",
  "method.opp.body":
    "Potencial futuro según la motivación del vendedor y la ventaja: la cantidad y el tamaño de los recortes de precio reales, los días en el mercado, si la descripción señala valor agregado (inversionista / renovación / como está), y cuánto por debajo de los comparables ya está.",
  "method.cap.title": "Tasa de capitalización y flujo",
  "method.cap.body":
    "Ingreso operativo neto dividido por el precio. El ingreso es el estimado de renta de Zillow cuando existe, o un modelo transparente (señalado como tal). Los gastos son el impuesto predial real, la cuota HOA real y un 30% para vacancia, mantenimiento, seguro y administración. El flujo luego resta la hipoteca.",
  "method.assumptions.title": "Supuestos declarados",
  "method.assumptions.down": "Enganche",
  "method.assumptions.rate": "Tasa hipotecaria",
  "method.assumptions.rateNote": "en vivo de FRED",
  "method.assumptions.term": "Plazo del préstamo",
  "method.assumptions.opex": "Gastos operativos",
  "method.assumptions.years": "30 años",
  "method.verdict.title": "De puntuaciones a veredicto",
  "method.verdict.body":
    "Global = 55% valor + 45% oportunidad. 70+ es Compra fuerte (salvo que cinco o más riesgos lo bajen un nivel), 50–69 es Vale la pena, menos de 50 es Descartar. Descartar una mala oferta es el punto.",
};

const DICTS: Record<Lang, Dict> = { en, es };

export function translate(lang: Lang, key: string, vars?: Record<string, string | number>): string {
  let s = DICTS[lang][key] ?? DICTS.en[key] ?? key;
  if (vars) for (const [k, v] of Object.entries(vars)) s = s.replaceAll(`{${k}}`, String(v));
  return s;
}
