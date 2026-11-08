// Texto a terminos y terminos a puntaje: lo minimo para buscar sin depender de
// ningun servicio. Tokenizacion que entiende nombres de codigo (camelCase,
// snake_case, rutas) y palabras en espanol e ingles; BM25 con campos.

const STOP = new Set(
  (
    // espanol
    "a al algo algun alguna algunos ante aqui asi aun cada como con cual cuando de del desde donde dos e el ella ellos en entre era es esta estan este esto estos fue ha han hay la las le les lo los mas me mi mismo mucho muy ni no nos o otra otro para pero poco por porque que quien se sea ser si sin sobre su sus tambien tan te tiene todo todos tu un una uno unos y ya " +
    "ve ven va van vas debe deberia deberian puede pueden poder quiero quisiera necesito hay hacer hace hacen haga cuando cuanto vez vezes siempre nunca ahora luego despues antes " +
    // ingles
    "an and any are as at be been but by can could did do does for from had has have how if in into is it its may more my no not of on or our should so some than that the their then there these they this to too up was we were what when where which who why will with would you your"
  ).split(/\s+/),
);

export function strip(text) {
  return text.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase();
}

// Palabras de un texto o de un identificador: parte camelCase, snake_case,
// kebab-case y rutas; sin acentos y en minusculas.
export function words(text) {
  const spaced = text.replace(/([a-z0-9])([A-Z])/g, "$1 $2").replace(/([A-Z]+)([A-Z][a-z])/g, "$1 $2");
  return strip(spaced).match(/[a-z0-9]+/g) ?? [];
}

// Raiz barata: sin plural y recortada, para que "seleccionar", "seleccion" y
// "seleccionando" se encuentren. No intenta ser un lematizador.
export function stem(word) {
  let w = word;
  if (w.length > 4 && w.endsWith("es")) w = w.slice(0, -2);
  else if (w.length > 3 && w.endsWith("s") && !w.endsWith("ss")) w = w.slice(0, -1);
  return w.length > 6 ? w.slice(0, 6) : w;
}

export function tokens(text) {
  return words(text)
    .filter((word) => word.length > 1 && !STOP.has(word))
    .map(stem);
}

// BM25 sobre documentos con campos ponderados (BM25F simplificado): cada campo
// aporta su frecuencia multiplicada por su peso; la longitud es la suma
// ponderada. `docs`: [{ id, fields: { campo: [terminos] } }].
export class Bm25 {
  constructor(docs, weights, { k1 = 1.2, b = 0.5 } = {}) {
    this.k1 = k1;
    this.b = b;
    this.docs = new Map();
    this.df = new Map();
    let total = 0;
    for (const { id, fields } of docs) {
      const tf = new Map();
      let length = 0;
      for (const [field, terms] of Object.entries(fields)) {
        const weight = weights[field] ?? 0;
        if (!weight) continue;
        for (const term of terms) {
          tf.set(term, (tf.get(term) ?? 0) + weight);
          length += weight;
        }
      }
      this.docs.set(id, { tf, length });
      total += length;
      for (const term of tf.keys()) this.df.set(term, (this.df.get(term) ?? 0) + 1);
    }
    this.avg = docs.length ? total / docs.length : 1;
  }

  idf(term) {
    const n = this.docs.size;
    const df = this.df.get(term) ?? 0;
    return Math.log(1 + (n - df + 0.5) / (df + 0.5));
  }

  // `query`: [terminos] (con repeticiones). Devuelve Map id -> { score, matched }.
  score(query) {
    const unique = [...new Set(query)];
    const out = new Map();
    for (const [id, { tf, length }] of this.docs) {
      let score = 0;
      const matched = [];
      for (const term of unique) {
        const f = tf.get(term);
        if (!f) continue;
        score += (this.idf(term) * f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + (this.b * length) / this.avg));
        matched.push(term);
      }
      if (score > 0) out.set(id, { score, matched });
    }
    return out;
  }
}
